const { sendSuccess, sendError } = require('../utils/response.util');
const {
    analyzeTripFairnessData,
    callNugenTripAnalysis,
    getFairnessTelemetry,
    resetFairnessTelemetry,
    computeOrganizerHubTransfers,
    computeThresholdFilteredTransfers,
    computeMinTransferSet,
    normalizeTripFairnessInput
} = require('../services/nugen.service');

/**
 * Controller: Deterministic fairness & settlement analysis
 */
async function analyzeTripFairness(req, res) {
    try {
        const tripData = req.validatedTripData || req.body?.tripData || req.body || {};

        if (!tripData || typeof tripData !== 'object' || Array.isArray(tripData)) {
            return sendError(res, 'Valid trip data object is required for fairness analysis.', null, 400);
        }

        const apiKey = process.env.NUGEN_API_KEY || 'nugen-404275678978f566';
        const modelId = req.body?.modelId || process.env.NUGEN_MODEL_ID || 'llama-v3p2-3b-reasoning';

        const result = await callNugenTripAnalysis({
            apiKey,
            tripData,
            modelId,
            systemPrompt: 'Evaluate trip expense equity, detect fronting stress, and recommend optimal settlement paths.'
        });

        return sendSuccess(res, 'Trip fairness analysis generated successfully.', result.data || result);
    } catch (error) {
        console.error('[FairnessController] Error analyzing trip:', error);
        return sendError(res, error.message || 'Failed to analyze trip fairness.', null, 500);
    }
}

/**
 * Controller: External Nugen AI enriched analysis with local domain failsafe
 */
async function analyzeTripWithNugen(req, res) {
    try {
        const tripData = req.validatedTripData || req.body?.tripData || req.body || {};
        const apiKey = process.env.NUGEN_API_KEY || process.env.nugen || 'nugen-404275678978f566';

        if (!tripData || typeof tripData !== 'object' || Array.isArray(tripData)) {
            return sendError(res, 'Valid trip data object is required for Nugen analysis.', null, 400);
        }

        const result = await callNugenTripAnalysis({
            apiKey,
            tripData,
            modelId: req.body?.modelId || process.env.NUGEN_MODEL_ID || 'trip-fairness-core',
            systemPrompt: req.body?.systemPrompt || 'Analyze trip expense fairness, identify anomalies, and recommend the best settlement strategy for a group trip.'
        });

        return sendSuccess(res, 'Nugen-powered trip analysis completed.', result.data || result);
    } catch (error) {
        console.error('[FairnessController] Error calling Nugen:', error);
        return sendError(res, error.message || 'Failed to process trip analysis with Nugen.', null, 500);
    }
}

/**
 * Controller: Real-time simulation of alternative settlement modes
 * (min_transfers | organizer_hub | threshold_filter)
 */
async function simulateSettlementStrategy(req, res) {
    try {
        const tripData = req.validatedTripData || req.body?.tripData || req.body || {};
        const mode = (req.body?.mode || 'min_transfers').toLowerCase();
        const threshold = Number(req.body?.threshold) || 20;
        const organizerId = req.body?.organizerId;

        const analysis = analyzeTripFairnessData(tripData);
        const { settlementStrategy } = analysis;

        let selectedStrategy;
        if (mode === 'organizer_hub') {
            selectedStrategy = {
                mode: 'organizer_hub',
                transfers: settlementStrategy.alternativeStrategies?.organizerHub || []
            };
        } else if (mode === 'threshold_filter') {
            selectedStrategy = {
                mode: 'threshold_filter',
                threshold,
                transfers: settlementStrategy.alternativeStrategies?.thresholdFilter?.activeTransfers || [],
                absorbed: settlementStrategy.alternativeStrategies?.thresholdFilter?.absorbedTransfers || [],
                absorbedTotal: settlementStrategy.alternativeStrategies?.thresholdFilter?.absorbedTotal || 0
            };
        } else {
            selectedStrategy = {
                mode: 'min_transfers',
                transfers: settlementStrategy.minTransferSet || []
            };
        }

        return sendSuccess(res, `Settlement strategy simulated using "${mode}" mode.`, {
            fairnessScore: analysis.fairnessScore,
            riskLevel: analysis.riskLevel,
            stressAssessment: analysis.riskAssessment,
            selectedStrategy,
            travelerBreakdown: settlementStrategy.travelerBreakdown
        });
    } catch (error) {
        console.error('[FairnessController] Error simulating settlement:', error);
        return sendError(res, error.message || 'Failed to simulate settlement strategy.', null, 500);
    }
}

/**
 * Controller: Telemetry & Monitoring Metrics for AI/Fairness Engine
 */
async function getFairnessMetrics(req, res) {
    try {
        const metrics = getFairnessTelemetry();
        return sendSuccess(res, 'Fairness engine telemetry metrics retrieved.', metrics);
    } catch (error) {
        return sendError(res, 'Failed to fetch fairness telemetry metrics.', null, 500);
    }
}

module.exports = {
    analyzeTripFairness,
    analyzeTripWithNugen,
    simulateSettlementStrategy,
    getFairnessMetrics
};
