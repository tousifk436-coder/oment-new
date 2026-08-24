/* ============================================================================
   IMMIGRATION MILESTONE TEMPLATES (spec §18–20)
   ----------------------------------------------------------------------------
   Service select karte hi ek default milestone template SUGGEST hota hai.
   User use accept / edit / delete / reorder / blank-se-start kar sakta hai.
   Templates force nahi hote — ye sirf starting point hain.

   Har entry: { title, description, days (deadline offset from previous),
               priority }
   ============================================================================ */

(function (root) {
  'use strict';

  function m(title, description, days, priority) {
    return { title: title, description: description || '', days: days || 1, priority: priority || 'MEDIUM' };
  }

  var GENERIC = [
    m('Initial Client Information', 'Collect client details, history and objectives.', 1, 'HIGH'),
    m('Document Collection', 'Request and receive all required documents from the client.', 3, 'HIGH'),
    m('Document Review', 'Verify completeness, consistency and translations.', 2, 'HIGH'),
    m('Application Preparation', 'Prepare forms and supporting submissions.', 3, 'HIGH'),
    m('Final Review', 'Internal quality review of the complete package.', 1, 'CRITICAL'),
    m('Client Approval', 'Client reviews and approves the final package.', 1, 'HIGH'),
    m('Submission', 'Submit the application and archive confirmation.', 1, 'CRITICAL')
  ];

  var TEMPLATES = {

    /* spec §19 — 10-step Visitor Visa template */
    'Visitor Visa / TRV': [
      m('Initial Client Information', 'Intake: identity, travel purpose, ties to home country, history.', 1, 'HIGH'),
      m('Document Collection', 'Passport, financials, employment letter, invitation, itinerary.', 3, 'HIGH'),
      m('Document Review', 'Check completeness, dates, translations and consistency.', 2, 'HIGH'),
      m('Application Form Preparation', 'IMM 5257 and related forms completed and validated.', 2, 'HIGH'),
      m('Supporting Letter / Submission Preparation', 'Representative submission letter and document index.', 2, 'MEDIUM'),
      m('Final Review', 'Full package quality review before client sign-off.', 1, 'CRITICAL'),
      m('Client Approval', 'Client confirms accuracy and authorizes submission.', 1, 'HIGH'),
      m('Application Submission', 'Submit on IRCC portal; pay fees.', 1, 'CRITICAL'),
      m('Submission Confirmation', 'Save AOR/confirmation and receipts to the file.', 1, 'MEDIUM'),
      m('Decision Tracking', 'Monitor account for biometrics/ADR/decision updates.', 5, 'MEDIUM')
    ],

    'Express Entry': [
      m('Profile Assessment & CRS Review', 'Eligibility, CRS calculation, program selection.', 2, 'HIGH'),
      m('Language / ECA Verification', 'Confirm valid IELTS/CELPIP and ECA reports.', 2, 'HIGH'),
      m('Express Entry Profile Creation', 'Create/update the EE profile accurately.', 2, 'HIGH'),
      m('ITA Document Collection', 'Police certificates, proof of funds, employment records.', 5, 'HIGH'),
      m('e-APR Preparation', 'Complete forms and upload package for e-APR.', 4, 'HIGH'),
      m('Final Review', 'Full application quality review.', 1, 'CRITICAL'),
      m('Submission & Confirmation', 'Submit e-APR, pay fees, archive AOR.', 1, 'CRITICAL')
    ],

    'Study Permit': [
      m('Initial Client Information', 'Intake: program, LOA, funding, history.', 1, 'HIGH'),
      m('LOA & Financial Documents', 'Letter of acceptance, GIC/funds, tuition receipts.', 3, 'HIGH'),
      m('SOP / Study Plan Drafting', 'Statement of purpose aligned with profile.', 3, 'HIGH'),
      m('Forms & Package Preparation', 'IMM 1294 and supporting package.', 2, 'HIGH'),
      m('Final Review', 'Quality review of complete package.', 1, 'CRITICAL'),
      m('Client Approval', 'Client authorizes submission.', 1, 'HIGH'),
      m('Submission & Confirmation', 'Submit, pay fees, archive confirmation.', 1, 'CRITICAL')
    ],

    'Work Permit': [
      m('Initial Client Information', 'Intake: job offer, LMIA/exemption, qualifications.', 1, 'HIGH'),
      m('Employer / LMIA Documents', 'Offer letter, LMIA or exemption proof, contracts.', 3, 'HIGH'),
      m('Applicant Document Collection', 'Credentials, experience letters, identity documents.', 3, 'HIGH'),
      m('Forms & Package Preparation', 'IMM 1295 and supporting submissions.', 2, 'HIGH'),
      m('Final Review', 'Quality review of complete package.', 1, 'CRITICAL'),
      m('Submission & Confirmation', 'Submit, pay fees, archive confirmation.', 1, 'CRITICAL')
    ],

    'Family Sponsorship': [
      m('Eligibility Assessment', 'Sponsor and applicant eligibility review.', 2, 'HIGH'),
      m('Relationship Evidence Collection', 'Marriage/relationship proofs, photos, communication records.', 5, 'HIGH'),
      m('Sponsor Documents', 'Income proof, status documents, undertakings.', 3, 'HIGH'),
      m('Forms & Package Preparation', 'Complete sponsorship and PR forms.', 4, 'HIGH'),
      m('Final Review', 'Full package quality review.', 1, 'CRITICAL'),
      m('Submission & Confirmation', 'Submit package and archive confirmation.', 1, 'CRITICAL')
    ],

    'Super Visa': [
      m('Initial Client Information', 'Intake: host details, relationship, travel plans.', 1, 'HIGH'),
      m('Host Income & Insurance', 'LICO proof, invitation letter, medical insurance policy.', 3, 'HIGH'),
      m('Applicant Documents', 'Identity, ties, financials.', 2, 'HIGH'),
      m('Forms & Package Preparation', 'Forms and submission letter.', 2, 'HIGH'),
      m('Final Review', 'Quality review.', 1, 'CRITICAL'),
      m('Submission & Confirmation', 'Submit and archive confirmation.', 1, 'CRITICAL')
    ],

    'Refugee Claim': [
      m('Intake & Conflict Check', 'Detailed intake, urgency and conflict screening.', 1, 'CRITICAL'),
      m('BOC Narrative Drafting', 'Basis of Claim narrative drafted with the claimant.', 4, 'CRITICAL'),
      m('Supporting Evidence Collection', 'Identity, country conditions, corroborating evidence.', 5, 'HIGH'),
      m('Forms Preparation', 'BOC and associated forms finalized.', 2, 'CRITICAL'),
      m('Claimant Review & Sign-off', 'Claimant reviews narrative and confirms accuracy.', 1, 'CRITICAL'),
      m('Submission', 'Submit claim package; calendar RPD deadlines.', 1, 'CRITICAL'),
      m('Hearing Preparation Tracking', 'Disclosure deadlines and hearing prep milestones.', 5, 'HIGH')
    ],

    'Refugee Appeal': [
      m('RPD Decision Analysis', 'Analyze reasons paragraph-by-paragraph; identify errors.', 2, 'CRITICAL'),
      m('New Evidence Assessment', 'Assess admissibility of new evidence (IRPA s.110(4)).', 2, 'HIGH'),
      m('Appellant Record Drafting', 'Memorandum and record preparation.', 5, 'CRITICAL'),
      m('Final Review', 'Quality review against RAD Rules.', 1, 'CRITICAL'),
      m('Perfect the Appeal', 'File appellant record within the deadline.', 1, 'CRITICAL')
    ],

    'Detention Review': [
      m('Detainee Intake & Facts', 'Grounds of detention, alternatives, sureties.', 1, 'CRITICAL'),
      m('Release Plan Preparation', 'Alternatives to detention and bondsperson documents.', 1, 'CRITICAL'),
      m('Hearing Preparation', 'Submissions and witness preparation.', 1, 'CRITICAL'),
      m('Hearing & Follow-up', 'Attend review; record outcome and next review date.', 1, 'CRITICAL')
    ],

    'Refusal Review': [
      m('Refusal Analysis', 'GCMS/notes ordering and refusal reasons analysis.', 3, 'HIGH'),
      m('Options Assessment', 'Reapply vs reconsideration vs judicial review support.', 2, 'HIGH'),
      m('Response Preparation', 'Prepare the selected response package.', 4, 'HIGH'),
      m('Final Review & Submission', 'Quality review and submission.', 1, 'CRITICAL')
    ],

    'Status / Restoration': [
      m('Status Assessment', 'Confirm status loss date and 90-day restoration window.', 1, 'CRITICAL'),
      m('Document Collection', 'Supporting documents and explanation letter.', 2, 'HIGH'),
      m('Application Preparation', 'Restoration forms and fees.', 2, 'HIGH'),
      m('Final Review & Submission', 'Submit within the restoration window.', 1, 'CRITICAL')
    ],

    'Consultation': [
      m('Pre-Consultation Intake', 'Collect background before the meeting.', 1, 'MEDIUM'),
      m('Consultation Session', 'Conduct consultation; record advice given.', 1, 'HIGH'),
      m('Summary & Next Steps', 'Send written summary and recommended pathway.', 1, 'MEDIUM')
    ]
  };

  root.ImmTemplates = {
    TEMPLATES: TEMPLATES,
    GENERIC: GENERIC,
    get: function (service) {
      var t = TEMPLATES[service];
      return JSON.parse(JSON.stringify(t || GENERIC));
    },
    has: function (service) { return !!TEMPLATES[service]; }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.ImmTemplates;

})(typeof window !== 'undefined' ? window : globalThis);
