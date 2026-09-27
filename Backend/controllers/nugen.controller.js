const { sendSuccess, sendError } = require('../utils/response.util');
const { analyzeTripFairnessData, callNugenTripAnalysis } = require('../services/nugen.service');

async function analyzeTripFairness(req, res) {
  try {
    const tripData = req.body?.tripData || req.body || {};

    if (!tripData || typeof tripData !== 'object') {
      return sendError(res, 'Trip data is required for fairness analysis.', null, 400);
    }

    const analysis = analyzeTripFairnessData(tripData);
    return sendSuccess(res, 'Trip fairness analysis generated successfully.', {
      ...analysis,
      model: 'domain-alignment-ready'
    });
  } catch (error) {
    return sendError(res, error.message || 'Failed to analyze trip fairness.', null, 500);
  }
}

async function analyzeTripWithNugen(req, res) {
  try {
    const tripData = req.body?.tripData || req.body || {};
    const apiKey = process.env.NUGEN_API_KEY || process.env.nugen || 'nugen-404275678978f566';

    if (!tripData || typeof tripData !== 'object') {
      return sendError(res, 'Trip data is required for Nugen analysis.', null, 400);
    }

    const result = await callNugenTripAnalysis({
      apiKey,
      tripData,
      modelId: process.env.NUGEN_MODEL_ID || 'domain-aligned-trip-fairness',
      systemPrompt: 'Analyze trip expense fairness, identify anomalies, and recommend the best settlement strategy for a group trip.'
    });

    return sendSuccess(res, 'Nugen-powered trip analysis completed.', result.data || result);
  } catch (error) {
    return sendError(res, error.message || 'Failed to process trip analysis with Nugen.', null, 500);
  }
}

module.exports = {
  analyzeTripFairness,
  analyzeTripWithNugen
};
