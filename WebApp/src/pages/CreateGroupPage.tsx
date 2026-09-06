import React, { useState, useMemo, useEffect } from 'react';
import { Plane, Compass, Sparkles } from 'lucide-react';
import { CreateGroupHeader } from '../components/CreateGroupHeader';

import { StepProgress } from '../components/StepProgress';
import { DestinationInput } from '../components/DestinationInput';
import { DateRangePicker } from '../components/DateRangePicker';
import { TripTypeSelector } from '../components/TripTypeSelector';
import { TravelersSection } from '../components/TravelersSection';
import { TripPreferences } from '../components/TripPreferences';
import { TripDescription } from '../components/TripDescription';
import { TripPreview } from '../components/TripPreview';
import { FinancePreview } from '../components/FinancePreview';
import { CreateGroupActionBar } from '../components/CreateGroupActionBar';
import { ReviewConfirmSection } from '../components/ReviewConfirmSection';
import { ToastNotification, ToastMessage } from '../components/ToastNotification';
import { SuccessModal } from '../components/SuccessModal';
import { PaymentModal } from '../components/PaymentModal';
import { TripFormData, Traveler, TripType, Currency, ExpenseSplit, CreatedGroupData, PaymentDetails } from '../types/group';
import { groupService } from '../services/group.service';
import { useAuth } from '../context/AuthContext';

const getInitialTripForm = (user?: any): TripFormData => {
  const travelers: Traveler[] = [];
  if (user?.emailId) {
    travelers.push({
      id: 'organizer-me',
      name: user.username || 'Organizer',
      email: user.emailId,
      role: 'Organizer',
      avatarBg: '#059669',
      isRegistered: true,
      status: 'ACCEPTED'
    });
  }
  return {
    groupName: '',
    destination: '',
    startDate: '',
    endDate: '',
    tripType: 'Friends',
    currency: 'INR',
    expenseSplit: 'equal',
    description: '',
    travelers
  };
};

interface CreateGroupPageProps {
  onNavigateDashboard?: (newGroupId?: string) => void;
}

export const CreateGroupPage: React.FC<CreateGroupPageProps> = ({ onNavigateDashboard }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<TripFormData>(() => getInitialTripForm(user));
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<CreatedGroupData | null>(null);

  // Synchronize logged-in user as the group organizer when user data is ready
  useEffect(() => {
    if (user?.emailId) {
      setFormData((prev) => {
        const hasOrganizer = prev.travelers.some(
          (t) => t.role === 'Organizer' && t.email.toLowerCase() === user.emailId?.toLowerCase()
        );
        if (hasOrganizer) return prev;

        const organizerTraveler: Traveler = {
          id: 'organizer-me',
          name: user.username || 'Organizer',
          email: user.emailId,
          role: 'Organizer',
          avatarBg: '#059669',
          isRegistered: true,
          status: 'ACCEPTED'
        };
        return {
          ...prev,
          travelers: [
            organizerTraveler,
            ...prev.travelers.filter((t) => t.role !== 'Organizer')
          ]
        };
      });
    }
  }, [user?.emailId, user?.username]);

  // Helper for adding toast notifications
  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Helper for date formatting
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const startDateFormatted = useMemo(() => formatDate(formData.startDate), [formData.startDate]);
  const endDateFormatted = useMemo(() => formatDate(formData.endDate), [formData.endDate]);

  // Dynamic trip duration calculation
  const durationDays = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [formData.startDate, formData.endDate]);

  // Form field handlers
  const handleGroupNameChange = (val: string) => {
    setFormData((prev) => ({ ...prev, groupName: val }));
    if (errors.groupName) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.groupName;
        return copy;
      });
    }
  };

  const handleDestinationChange = (val: string) => {
    setFormData((prev) => ({ ...prev, destination: val }));
    if (errors.destination) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.destination;
        return copy;
      });
    }
  };

  const handleStartDateChange = (val: string) => {
    setFormData((prev) => ({ ...prev, startDate: val }));
    if (errors.startDate) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.startDate;
        return copy;
      });
    }
  };

  const handleEndDateChange = (val: string) => {
    setFormData((prev) => ({ ...prev, endDate: val }));
    if (errors.endDate) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.endDate;
        return copy;
      });
    }
  };

  const handleTripTypeChange = (type: TripType) => {
    setFormData((prev) => ({ ...prev, tripType: type }));
  };

  const handleCurrencyChange = (curr: Currency) => {
    setFormData((prev) => ({ ...prev, currency: curr }));
    addToast(`Currency set to ${curr}`, 'info');
  };

  const handleExpenseSplitChange = (split: ExpenseSplit) => {
    setFormData((prev) => ({ ...prev, expenseSplit: split }));
  };

  const handleDescriptionChange = (desc: string) => {
    setFormData((prev) => ({ ...prev, description: desc }));
  };

  const handleAddTraveler = (newTraveler: Omit<Traveler, 'id'>) => {
    const id = 'traveler-' + Date.now().toString() + '-' + Math.random().toString(36).substring(2, 6);
    setFormData((prev) => {
      const emailExists = prev.travelers.some(
        (t) => t.email.toLowerCase() === newTraveler.email.toLowerCase()
      );
      if (emailExists) {
        addToast(`${newTraveler.email} is already in the traveler list`, 'info');
        return prev;
      }
      return {
        ...prev,
        travelers: [...prev.travelers, { ...newTraveler, id }]
      };
    });
    if (errors.travelers) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.travelers;
        return copy;
      });
    }
    addToast(`Added ${newTraveler.name} to the trip!`, 'success');
  };

  const handleRemoveTraveler = (id: string | number) => {
    setFormData((prev) => ({
      ...prev,
      travelers: prev.travelers.filter((t) => t.id !== id)
    }));
    addToast('Traveler removed', 'info');
  };

  // Form actions
  const handleReset = () => {
    setFormData(getInitialTripForm(user));
    setErrors({});
    setCurrentStep(1);
    addToast('Form reset to clean trip state', 'info');
  };

  const handleSaveDraft = () => {
    localStorage.setItem('triptual_trip_draft', JSON.stringify(formData));
    addToast('Trip draft saved securely in browser!', 'success');
  };

  const handleNextStep = () => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.groupName.trim()) {
        newErrors.groupName = 'Group name is required';
      }
      if (!formData.destination.trim()) {
        newErrors.destination = 'Destination is required';
      }
      if (!formData.startDate) {
        newErrors.startDate = 'Start date is required';
      }
      if (!formData.endDate) {
        newErrors.endDate = 'End date is required';
      } else if (formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) {
        newErrors.endDate = 'End date cannot be earlier than start date';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        addToast('Please complete all required trip details', 'error');
        return;
      }
      setErrors({});
      setCurrentStep(2);
      window.scrollTo({ top: 40, behavior: 'smooth' });
    } else if (currentStep === 2) {
      if (formData.travelers.length === 0) {
        newErrors.travelers = 'At least one traveler is required';
        setErrors(newErrors);
        addToast('At least one traveler is required', 'error');
        return;
      }
      setErrors({});
      setCurrentStep(3);
      window.scrollTo({ top: 40, behavior: 'smooth' });
    } else if (currentStep === 3) {
      setCurrentStep(4);
      window.scrollTo({ top: 40, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 40, behavior: 'smooth' });
    }
  };

  const handleStepClick = (stepNumber: number) => {
    if (stepNumber < currentStep) {
      setCurrentStep(stepNumber);
      window.scrollTo({ top: 40, behavior: 'smooth' });
    }
  };

  const handleBackToEdit = () => {
    setCurrentStep(3);
    window.scrollTo({ top: 40, behavior: 'smooth' });
  };

  const submitWithData = async (dataToSubmit: TripFormData) => {
    setIsSubmitting(true);
    try {
      const response = await groupService.createGroup(dataToSubmit);
      if (response.data) {
        setCreatedGroup(response.data);
        setIsSuccessModalOpen(true);
        addToast('Trip workspace created successfully!', 'success');
      } else {
        addToast(response.message || 'Failed to create group', 'error');
      }
    } catch (err: any) {
      console.error('Submit group error:', err);
      if (err.status === 402 || err.data?.data?.requiresPayment) {
        setIsPaymentModalOpen(true);
        addToast('Large groups (7+ members) require a ₹19 upgrade fee. Please complete payment.', 'info');
      } else {
        addToast(err.message || 'Error creating group trip', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmAndSubmit = async () => {
    // If more than 6 members and not yet paid, open payment modal
    if (formData.travelers.length > 6 && formData.payment?.status !== 'PAID') {
      setIsPaymentModalOpen(true);
      return;
    }
    await submitWithData(formData);
  };

  const handlePaymentSuccess = async (paymentRecord: PaymentDetails) => {
    setIsPaymentModalOpen(false);
    const updatedFormData: TripFormData = {
      ...formData,
      payment: paymentRecord
    };
    setFormData(updatedFormData);
    addToast('Payment of ₹19 verified! Creating your trip...', 'success');
    await submitWithData(updatedFormData);
  };

  const getPageTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Trip Details';
      case 2:
        return 'Who’s Going?';
      case 3:
        return 'Trip Preferences';
      case 4:
        return 'Confirm Group Application';
      default:
        return 'Create a New Group';
    }
  };

  const getPageSubtitle = () => {
    switch (currentStep) {
      case 1:
        return 'Set your trip name, destination, and travel dates.';
      case 2:
        return 'Manage travelers and send official invitations to your shared ledger.';
      case 3:
        return 'Choose your ledger currency and default expense sharing formula.';
      case 4:
        return 'Review your trip details, ledger configuration, and member roster before activation.';
      default:
        return 'Organize bookings and split expenses effortlessly.';
    }
  };

  return (
    <div className="app-container">
      <CreateGroupHeader 
        onHelpClick={() => addToast('GroupTrip Ledger: Create trip, invite companions, track splits & settle debts.', 'info')} 
        onDashboardClick={onNavigateDashboard}
      />

      <main className="main-content">
        {/* Dynamic Step Header */}
        <section className="page-header-section">
          <div className="page-badge">
            <Plane size={13} />
            <span>Group Travel & Expense Coordinator</span>
          </div>
          <h1 className="page-title">{getPageTitle()}</h1>
          <p className="page-subtitle">{getPageSubtitle()}</p>
        </section>

        {/* Step Progress Indicator (Clickable on visited steps) */}
        <StepProgress currentStep={currentStep} onStepClick={handleStepClick} />

        {/* Step-by-Step Clean Card Presentation */}
        {currentStep === 4 ? (
          <ReviewConfirmSection
            formData={formData}
            durationDays={durationDays}
            startDateFormatted={startDateFormatted}
            endDateFormatted={endDateFormatted}
            onBackToEdit={handleBackToEdit}
            onConfirm={handleConfirmAndSubmit}
            isSubmitting={isSubmitting}
          />
        ) : (
          <div className="page-grid">
            {/* Main Form Column: Displays ONLY the active step */}
            <div className="form-column">
              {/* Step 1: Trip Details */}
              {currentStep === 1 && (
                <div className="form-section-card">
                  <div className="section-header">
                    <div className="section-title-row">
                      <h2 className="section-title">
                        <Compass size={20} className="section-title-icon" />
                        Trip Information
                      </h2>
                    </div>
                    <p className="section-subtitle">Give your trip a memorable name and choose where you're heading.</p>
                  </div>

                  {/* Group Name */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="group-name-input">
                      Group Name <span className="required-star">*</span>
                    </label>
                    <div className="input-with-icon">
                      <div className="input-icon">
                        <Sparkles size={18} />
                      </div>
                      <input
                        id="group-name-input"
                        type="text"
                        className={`text-input ${errors.groupName ? 'has-error' : ''}`}
                        placeholder="e.g. Goa Friends Trip"
                        value={formData.groupName}
                        onChange={(e) => handleGroupNameChange(e.target.value)}
                      />
                    </div>
                    {errors.groupName && <div className="field-error-msg">{errors.groupName}</div>}
                  </div>

                  {/* Destination */}
                  <DestinationInput
                    value={formData.destination}
                    onChange={handleDestinationChange}
                    error={errors.destination}
                  />

                  {/* Date Range Picker */}
                  <DateRangePicker
                    startDate={formData.startDate}
                    endDate={formData.endDate}
                    onStartDateChange={handleStartDateChange}
                    onEndDateChange={handleEndDateChange}
                    durationDays={durationDays}
                    startDateError={errors.startDate}
                    endDateError={errors.endDate}
                  />

                  {/* Trip Type Selector */}
                  <TripTypeSelector
                    selected={formData.tripType}
                    onChange={handleTripTypeChange}
                  />
                </div>
              )}

              {/* Step 2: Travelers Section */}
              {currentStep === 2 && (
                <TravelersSection
                  travelers={formData.travelers}
                  onAddTraveler={handleAddTraveler}
                  onRemoveTraveler={handleRemoveTraveler}
                  error={errors.travelers}
                />
              )}

              {/* Step 3: Trip Preferences & Notes */}
              {currentStep === 3 && (
                <>
                  <TripPreferences
                    currency={formData.currency}
                    onCurrencyChange={handleCurrencyChange}
                    expenseSplit={formData.expenseSplit}
                    onExpenseSplitChange={handleExpenseSplitChange}
                  />

                  <TripDescription
                    description={formData.description}
                    onChange={handleDescriptionChange}
                  />
                </>
              )}
            </div>

            {/* Right Column: Sticky Trip Preview (Active on Desktop) */}
            <aside className="preview-column-sticky">
              <TripPreview
                formData={formData}
                durationDays={durationDays}
                startDateFormatted={startDateFormatted}
                endDateFormatted={endDateFormatted}
              />

              <FinancePreview />
            </aside>
          </div>
        )}
      </main>

      {/* Fixed Bottom Action Bar for Steps 1, 2, and 3 */}
      {currentStep < 4 && (
        <CreateGroupActionBar
          currentStep={currentStep}
          onPrev={handlePrevStep}
          onNext={handleNextStep}
          onSaveDraft={handleSaveDraft}
          onReset={handleReset}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Interactive Toast Notifications */}
      <ToastNotification toasts={toasts} onDismiss={removeToast} />

      {/* Standard & Professional Success Modal with Multi-App Sharing */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => {
          setIsSuccessModalOpen(false);
          const newGroupId = createdGroup?.groupId;
          setFormData(getInitialTripForm(user));
          setCurrentStep(1);
          if (onNavigateDashboard) {
            onNavigateDashboard(newGroupId);
          }
        }}
        tripData={formData}
        createdGroup={createdGroup}
        durationDays={durationDays}
        startDateFormatted={startDateFormatted}
        endDateFormatted={endDateFormatted}
      />

      {/* Group Tier Upgrade Payment Modal for 7+ members */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentSuccess={handlePaymentSuccess}
        groupName={formData.groupName}
        memberCount={formData.travelers.length}
      />
    </div>
  );
};
