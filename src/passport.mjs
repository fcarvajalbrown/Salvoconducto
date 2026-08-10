const CATEGORIES = [
  { id: 'identity', label: 'Identity' },
  { id: 'contact', label: 'Contact' },
  { id: 'income', label: 'Income' },
  { id: 'payment', label: 'Payment' },
  { id: 'health', label: 'Health' },
  { id: 'schedule', label: 'Schedule' },
];

const FIELDS = [
  { key: 'identity.national_id', sensitivity: 'high', label: 'National ID', value: '12.345.678-9' },
  { key: 'identity.full_name', sensitivity: 'medium', label: 'Full name', value: 'Ana Rojas Pérez' },
  { key: 'identity.date_of_birth', sensitivity: 'medium', label: 'Date of birth', value: '1979-04-11' },
  { key: 'identity.home_address', sensitivity: 'high', label: 'Home address', value: 'Av. Grecia 1234, Ñuñoa' },
  { key: 'contact.phone', sensitivity: 'medium', label: 'Phone', value: '+56 9 8765 4321' },
  { key: 'contact.email', sensitivity: 'low', label: 'Email', value: 'ana.rojas@example.cl' },
  { key: 'contact.emergency', sensitivity: 'medium', label: 'Emergency contact', value: 'M. Rojas +56 9 5555 1212' },
  { key: 'income.monthly', sensitivity: 'high', label: 'Monthly income', value: 'CLP 520.000' },
  { key: 'income.employer', sensitivity: 'medium', label: 'Employer', value: 'Independent' },
  { key: 'income.tax_id', sensitivity: 'high', label: 'Tax ID', value: '12.345.678-9' },
  { key: 'payment.account', sensitivity: 'high', label: 'Bank account', value: 'Ch** **** **** 4417' },
  { key: 'payment.card_last4', sensitivity: 'medium', label: 'Card (last 4)', value: '4417' },
  { key: 'payment.history', sensitivity: 'high', label: 'Payment history', value: '36 months of transactions' },
  { key: 'health.diagnosis_code', sensitivity: 'high', label: 'Diagnosis code', value: 'ICD-10 G35' },
  { key: 'health.full_history', sensitivity: 'high', label: 'Full medical history', value: '14 years of records' },
  { key: 'health.medications', sensitivity: 'high', label: 'Medications', value: 'ocrelizumab' },
  { key: 'health.blood_type', sensitivity: 'medium', label: 'Blood type', value: 'O+' },
  { key: 'health.disability_rating', sensitivity: 'high', label: 'Disability rating', value: '45%' },
  { key: 'schedule.today', sensitivity: 'low', label: "Today's calendar", value: '2 events' },
  { key: 'schedule.location', sensitivity: 'medium', label: 'Location', value: 'Santiago, CL' },
];

const LABELS = new Map(CATEGORIES.map((c) => [c.id, c.label]));

function categoryIdOf(key) {
  return key.slice(0, key.indexOf('.'));
}

function decorate(f) {
  const category = categoryIdOf(f.key);
  return { ...f, category, categoryLabel: LABELS.get(category) };
}

export function createPassport() {
  const map = new Map(FIELDS.map((f) => [f.key, f]));
  return {
    list() { return FIELDS.map(decorate); },
    get(key) { return map.get(key)?.value; },
    meta(key) { const f = map.get(key); return f ? decorate(f) : undefined; },
    count() { return FIELDS.length; },
    categories() {
      return CATEGORIES.map((c) => ({
        ...c,
        fields: FIELDS.filter((f) => categoryIdOf(f.key) === c.id).map(decorate),
      }));
    },
    categoryCount() { return CATEGORIES.length; },
    categoryOf(key) { const f = map.get(key); return f ? categoryIdOf(f.key) : undefined; },
  };
}
