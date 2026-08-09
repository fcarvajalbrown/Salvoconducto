const FIELDS = [
  { key: 'national_id', topic: 'Identity', sensitivity: 'high', label: 'National ID', value: '12.345.678-9' },
  { key: 'full_name', topic: 'Identity', sensitivity: 'medium', label: 'Full name', value: 'Ana Rojas Pérez' },
  { key: 'date_of_birth', topic: 'Identity', sensitivity: 'medium', label: 'Date of birth', value: '1979-04-11' },
  { key: 'home_address', topic: 'Identity', sensitivity: 'high', label: 'Home address', value: 'Av. Grecia 1234, Ñuñoa' },
  { key: 'phone', topic: 'Contacts', sensitivity: 'medium', label: 'Phone', value: '+56 9 8765 4321' },
  { key: 'email', topic: 'Contacts', sensitivity: 'low', label: 'Email', value: 'ana.rojas@example.cl' },
  { key: 'emergency_contact', topic: 'Contacts', sensitivity: 'medium', label: 'Emergency contact', value: 'M. Rojas +56 9 5555 1212' },
  { key: 'monthly_income', topic: 'Income', sensitivity: 'high', label: 'Monthly income', value: 'CLP 520.000' },
  { key: 'employer', topic: 'Income', sensitivity: 'medium', label: 'Employer', value: 'Independent' },
  { key: 'tax_id', topic: 'Income', sensitivity: 'high', label: 'Tax ID', value: '12.345.678-9' },
  { key: 'bank_account', topic: 'Payment', sensitivity: 'high', label: 'Bank account', value: 'Ch** **** **** 4417' },
  { key: 'card_last4', topic: 'Payment', sensitivity: 'medium', label: 'Card (last 4)', value: '4417' },
  { key: 'payment_history', topic: 'Payment', sensitivity: 'high', label: 'Payment history', value: '36 months of transactions' },
  { key: 'diagnosis_code', topic: 'Health', sensitivity: 'high', label: 'Diagnosis code', value: 'ICD-10 G35' },
  { key: 'full_medical_history', topic: 'Health', sensitivity: 'high', label: 'Full medical history', value: '14 years of records' },
  { key: 'medications', topic: 'Health', sensitivity: 'high', label: 'Medications', value: 'ocrelizumab' },
  { key: 'blood_type', topic: 'Health', sensitivity: 'medium', label: 'Blood type', value: 'O+' },
  { key: 'disability_percent', topic: 'Health', sensitivity: 'high', label: 'Disability rating', value: '45%' },
  { key: 'calendar_today', topic: 'Schedule', sensitivity: 'low', label: "Today's calendar", value: '2 events' },
  { key: 'location', topic: 'Schedule', sensitivity: 'medium', label: 'Location', value: 'Santiago, CL' },
];

export function createPassport() {
  const map = new Map(FIELDS.map((f) => [f.key, f]));
  return {
    list() { return FIELDS.map((f) => ({ ...f })); },
    get(key) { return map.get(key)?.value; },
    meta(key) { const f = map.get(key); return f ? { ...f } : undefined; },
    count() { return FIELDS.length; },
  };
}
