const { getKafkaClient } = require('./kafkaClient.util');
const { pool } = require('./db.util');
const { createInAppNotification, sendPushToUser } = require('./notification.util');
const { emitToUser, emitToGroup } = require('./socket.util');
const { sendEmail } = require('./mail.util');

let consumer = null;
let isConnected = false;
let isConnecting = false;

const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'notification-events';
const CONSUMER_GROUP = process.env.KAFKA_CONSUMER_GROUP || 'triptual-notification-group';

/**
 * Main Event Processor - Handles all event types consumed from Kafka or Fallback
 */
async function processNotificationEvent(eventMessage) {
  if (!eventMessage || !eventMessage.eventType) return;

  const { eventType, payload, eventId, timestamp } = eventMessage;
  console.log(`[Kafka Consumer] Processing event [${eventType}] (ID: ${eventId})`);

  try {
    switch (eventType) {
      // 1. Group Invitation Event
      case 'GROUP_INVITE': {
        const { inviteeEmail, inviterName, groupName, groupId, inviteCode } = payload;
        const title = `Trip Invitation: ${groupName}`;
        const body = `${inviterName || 'A trip member'} invited you to join "${groupName}"!`;
        const data = {
          type: 'GROUP_INVITE',
          groupId: String(groupId || ''),
          inviteCode: String(inviteCode || ''),
          groupName: String(groupName || ''),
          screen: 'InvitationScreen',
        };

        if (inviteeEmail) {
          const trimmed = inviteeEmail.trim().toLowerCase();
          const userRes = await pool.query('SELECT id, full_name FROM users WHERE LOWER(email_id) = $1 LIMIT 1', [trimmed]);
          if (userRes.rows.length > 0) {
            const inviteeUserId = userRes.rows[0].id;
            await createInAppNotification(inviteeUserId, { type: 'GROUP_INVITE', title, body, data });
            await sendPushToUser(inviteeUserId, { title, body, data });
          }

          // Also send Email Alert for Group Invite
          const emailSubject = `Trip Invitation: Join ${groupName} on Triptual`;
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; borderRadius: 10px;">
              <h2 style="color: #6366f1;">🏖️ You've been invited on a trip!</h2>
              <p>Hi there,</p>
              <p><strong>${inviterName || 'A friend'}</strong> invited you to join the group trip <strong>"${groupName}"</strong> on Triptual.</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; font-size: 14px; color: #6b7280;">Invitation Code</p>
                <h1 style="margin: 5px 0 0 0; letter-spacing: 4px; color: #4f46e5;">${inviteCode || 'JOIN'}</h1>
              </div>
              <p>Open your Triptual App and enter the invitation code to join your squad!</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #9ca3af;">Triptual Inc. - AI Powered Collaborative Travel</p>
            </div>
          `;
          sendEmail(trimmed, emailSubject, emailHtml).catch((e) => console.warn('[Kafka Consumer] Invite email send warning:', e.message));
        }
        break;
      }

      // 2. Member Joined Group Event
      case 'MEMBER_JOINED': {
        const { groupId, memberName, groupName, userId } = payload;
        const title = `New Member Joined! 🎉`;
        const body = `${memberName || 'A new traveler'} joined your trip group "${groupName || 'Trip'}"!`;
        const data = {
          type: 'MEMBER_JOINED',
          groupId: String(groupId || ''),
          screen: 'TripDetailsScreen',
        };

        // Notify entire group room via WebSockets
        emitToGroup(groupId, 'trip:member_joined', {
          groupId,
          userId,
          memberName,
          message: body,
          timestamp,
        });

        // Notify group members persistent DB & Push
        const membersRes = await pool.query('SELECT user_id FROM group_members WHERE group_id = $1 AND user_id != $2', [groupId, userId]);
        for (const row of membersRes.rows) {
          await createInAppNotification(row.user_id, { type: 'MEMBER_JOINED', title, body, data });
          await sendPushToUser(row.user_id, { title, body, data });
        }
        break;
      }

      // 3. Member Left Group Event
      case 'MEMBER_LEFT': {
        const { groupId, memberName, groupName, userId } = payload;
        const title = `Member Left Trip`;
        const body = `${memberName || 'A member'} left the group "${groupName || 'Trip'}".`;
        const data = {
          type: 'MEMBER_LEFT',
          groupId: String(groupId || ''),
          screen: 'TripDetailsScreen',
        };

        emitToGroup(groupId, 'trip:member_left', {
          groupId,
          userId,
          memberName,
          timestamp,
        });

        const membersRes = await pool.query('SELECT user_id FROM group_members WHERE group_id = $1 AND user_id != $2', [groupId, userId]);
        for (const row of membersRes.rows) {
          await createInAppNotification(row.user_id, { type: 'MEMBER_LEFT', title, body, data });
        }
        break;
      }

      // 4. Payment Confirmation / Receipt Event
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_SUCCESS': {
        const { userId, userEmail, amount, currency = 'INR', paymentId, groupName } = payload;
        const title = `Payment Successful 💳`;
        const formattedAmount = `${currency} ${Number(amount).toLocaleString('en-IN')}`;
        const body = `Your payment of ${formattedAmount} for "${groupName || 'Trip Package'}" was processed successfully. ID: ${paymentId || ''}`;
        const data = {
          type: 'PAYMENT_CONFIRMED',
          paymentId: String(paymentId || ''),
          amount: String(amount),
          screen: 'PaymentHistoryScreen',
        };

        if (userId) {
          await createInAppNotification(userId, { type: 'PAYMENT_CONFIRMED', title, body, data });
          await sendPushToUser(userId, { title, body, data });
        }

        // Send Email Receipt
        if (userEmail) {
          const emailSubject = `Payment Confirmation - ${formattedAmount}`;
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #10b981; border-radius: 10px;">
              <h2 style="color: #10b981;">✅ Payment Received</h2>
              <p>Thank you for your payment!</p>
              <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #6b7280;">Amount Paid:</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${formattedAmount}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Transaction ID:</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${paymentId || 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Date:</td><td style="padding: 8px 0; text-align: right;">${new Date().toLocaleDateString()}</td></tr>
              </table>
              <p style="font-size: 13px; color: #6b7280;">Your trip itinerary and access details are available in your Triptual Mobile App.</p>
            </div>
          `;
          sendEmail(userEmail, emailSubject, emailHtml).catch((e) => console.warn('[Kafka Consumer] Payment email send warning:', e.message));
        }
        break;
      }

      // 5. Trip Itinerary Update Event
      case 'TRIP_UPDATE': {
        const { groupId, groupName, updatedBy, updateDetails } = payload;
        const title = `Trip Updated: ${groupName || 'Itinerary'}`;
        const body = `${updatedBy || 'A organizer'} updated the trip itinerary for "${groupName || 'Trip'}".`;
        const data = {
          type: 'TRIP_UPDATE',
          groupId: String(groupId || ''),
          screen: 'TripDetailsScreen',
        };

        emitToGroup(groupId, 'trip:updated', {
          groupId,
          updateDetails,
          updatedBy,
          timestamp,
        });

        const membersRes = await pool.query('SELECT user_id FROM group_members WHERE group_id = $1', [groupId]);
        for (const row of membersRes.rows) {
          await createInAppNotification(row.user_id, { type: 'TRIP_UPDATE', title, body, data });
          await sendPushToUser(row.user_id, { title, body, data });
        }
        break;
      }

      // 6. Generic System Alert Event
      case 'SYSTEM_ALERT': {
        const { userId, title, body, data = {} } = payload;
        if (userId) {
          await createInAppNotification(userId, { type: 'SYSTEM_ALERT', title: title || 'System Notification', body: body || '', data });
          await sendPushToUser(userId, { title, body, data });
        }
        break;
      }

      default:
        console.warn(`[Kafka Consumer] Unhandled event type: ${eventType}`);
    }
  } catch (err) {
    console.error(`[Kafka Consumer] Error processing event [${eventType}]:`, err.message);
  }
}

/**
 * Start Kafka Consumer Loop
 */
async function startKafkaConsumer() {
  if (isConnected && consumer) return consumer;
  if (isConnecting) return null;

  const { kafka, isConfigured } = getKafkaClient();
  if (!kafka || !isConfigured) {
    return null;
  }

  isConnecting = true;
  try {
    consumer = kafka.consumer({
      groupId: CONSUMER_GROUP,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });

    await consumer.connect();
    await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false });

    isConnected = true;
    console.log(`[Kafka Consumer] Subscribed to topic '${KAFKA_TOPIC}' with group '${CONSUMER_GROUP}'`);

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const rawValue = message.value ? message.value.toString() : '';
          if (!rawValue) return;
          const parsedEvent = JSON.parse(rawValue);
          await processNotificationEvent(parsedEvent);
        } catch (err) {
          console.error('[Kafka Consumer] Message parsing/processing failed:', err.message);
        }
      },
    });

    return consumer;
  } catch (err) {
    console.warn('[Kafka Consumer] Connection / Subscription error:', err.message);
    consumer = null;
    isConnected = false;
    return null;
  } finally {
    isConnecting = false;
  }
}

/**
 * Disconnect Kafka Consumer
 */
async function stopKafkaConsumer() {
  if (consumer && isConnected) {
    try {
      await consumer.stop();
      await consumer.disconnect();
      isConnected = false;
      console.log('[Kafka Consumer] Disconnected cleanly.');
    } catch (err) {
      console.error('[Kafka Consumer] Disconnect error:', err.message);
    }
  }
}

module.exports = {
  startKafkaConsumer,
  stopKafkaConsumer,
  processNotificationEvent,
};
