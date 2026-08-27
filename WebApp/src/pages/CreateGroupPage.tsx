import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Plane, Compass, Sparkles } from 'lucide-react';
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
import { INITIAL_MOCK_TRIP } from '../mock/mockData';
import { TripFormData, Traveler, TripType, Currency, ExpenseSplit, CreatedGroupData } from '../types/group';
import { groupService } from '../services/group.service';
import { useAuth } from '../context/AuthContext';

export const CreateGroupPage: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<TripFormData>(INITIAL_MOCK_TRIP);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<CreatedGroupData | null>(null);

  // Set logged-in user as the first organizer if present
  useEffect(() => {
    if (user) {
      setFormData((prev) => {
        const hasUser = prev.travelers.some(
          (t) => t.email.toLowerCase() === user.emailId?.toLowerCase()
        );
        if (!hasUser && user.emailId) {
          const organizerTraveler: Traveler = {
            id: 'organizer-me',
            name: user.username,
            email: user.emailId,
            role: 'Organizer',
            avatarBg: '#059669',
            isRegistered: true
          };
          return {
            ...prev,
            travelers: [
              organizerTraveler,
              ...prev.travelers.filter((t) => t.role !== 'Organizer')
            ]
          };
        }
        return prev;
      });
    }
  }, [user]);

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
    const id = Date.now().toString();
    setFormData((prev) => ({
      ...prev,
      travelers: [...prev.travelers, { ...newTraveler, id }]
    }));
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
    setFormData(INITIAL_MOCK_TRIP);
    setErrors({});
    setCurrentStep(1);
    addToast('Form reset to default sample values', 'info');
  };

  const handleContinueToReview = () => {
    const newErrors: Record<string, string> = {};

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
    } else if (formData.endDate < new Date().toISOString().slice(0, 10)) {
      newErrors.endDate = 'End date must be today or later';
    } else if (formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      newErrors.endDate = 'End date cannot be earlier than start date';
    }
    if (formData.startDate && formData.startDate < new Date().toISOString().slice(0, 10)) {
      newErrors.startDate = 'Start date must be today or later';
    }
    if (formData.travelers.length < 2) {
      newErrors.travelers = 'At least two members are required';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      addToast('Please complete all required fields', 'error');
      window.scrollTo({ top: 180, behavior: 'smooth' });
    } else {
      setErrors({});
      setCurrentStep(4);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const handleBackToEdit = () => {
    setCurrentStep(1);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handleConfirmAndSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await groupService.createGroup(formData);
      if (response.data) {
        setCreatedGroup(response.data);
        setIsSuccessModalOpen(true);
        addToast('Trip workspace created successfully!', 'success');
      } else {
        addToast(response.message || 'Failed to create group', 'error');
      }
    } catch (err: any) {
      console.error('Submit group error:', err);
      addToast(err.message || 'Error creating group trip', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-container">
      <CreateGroupHeader onHelpClick={() => addToast('GroupTrip Ledger: Create trip, invite companions, track splits & settle debts.', 'info')} />

      <main className="main-content">
        <button type="button" className="create-back-button" onClick={onBack || (() => window.history.back())}><ArrowLeft size={17} /> Back to dashboard</button>
        {/* Page Heading */}
        <section className="page-header-section">
          <div className="page-badge">
            <Plane size={13} />
            <span>Group Travel & Expense Coordinator</span>
          </div>
          <h1 className="page-title">
            {currentStep === 4 ? 'Review & Confirm Group' : 'Create a New Group'}
          </h1>
          <p className="page-subtitle">
            {currentStep === 4
              ? 'Review your travel group setup and confirm details to generate the expense ledger.'
              : 'Set up your trip, invite your travelers, and keep every booking and expense organized from day one.'}
          </p>
        </section>

        {/* Step Progress Indicator */}
        <StepProgress currentStep={currentStep} />

        {/* Step 4: Confirm Application Section */}
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
          /* Step 1: Main Form & Sticky Live Preview */
          <div className="page-grid">
            {/* Left Column: Form Fields */}
            <div className="form-column">
              {/* Section 1: Trip Details */}
              <div className="form-section-card">
                <div className="section-header">
                  <div className="section-title-row">
                    <h2 className="section-title">
                      <Compass size={20} className="section-title-icon" />
                      Trip Details
                    </h2>
                  </div>
                  <p className="section-subtitle">Tell us a little about your upcoming trip.</p>
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
                  startDateFormatted={startDateFormatted}
                  endDateFormatted={endDateFormatted}
                  durationDays={durationDays}
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

              {/* Section 2: Travelers ("Who's Going?") */}
              <TravelersSection
                travelers={formData.travelers}
                onAddTraveler={handleAddTraveler}
                onRemoveTraveler={handleRemoveTraveler}
                error={errors.travelers}
              />

              {/* Section 3: Trip Preferences */}
              <TripPreferences
                currency={formData.currency}
                onCurrencyChange={handleCurrencyChange}
                expenseSplit={formData.expenseSplit}
                onExpenseSplitChange={handleExpenseSplitChange}
              />

              {/* Section 4: Trip Description */}
              <TripDescription
                description={formData.description}
                onChange={handleDescriptionChange}
              />
            </div>

            {/* Right Column: Sticky Trip Preview */}
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

      {/* Fixed Bottom Action Bar (in Step 1) */}
      {currentStep === 1 && (
        <CreateGroupActionBar
          onCancel={handleReset}
          onContinue={handleContinueToReview}
        />
      )}

      {/* Interactive Toast Notifications */}
      <ToastNotification toasts={toasts} onDismiss={removeToast} />

      {/* Standard & Professional Success Modal with Multi-App Sharing */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => {
          setIsSuccessModalOpen(false);
          setCurrentStep(1);
        }}
        tripData={formData}
        createdGroup={createdGroup}
        durationDays={durationDays}
        startDateFormatted={startDateFormatted}
        endDateFormatted={endDateFormatted}
      />
    </div>
  );
};
