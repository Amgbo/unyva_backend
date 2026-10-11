/**
 * Carrier Normalization Utility (Backend)
 * Normalizes carrier names, operator codes, and rebranding variations
 * (e.g., Vodafone Ghana -> Telecel Ghana, AirtelTigo -> AT).
 */

export interface CanonicalCarrier {
  canonicalName: 'MTN' | 'Telecel' | 'AT' | 'Glo';
  networkCode: string;
}

export function normalizeCarrierName(rawInput?: string | null): CanonicalCarrier | null {
  if (!rawInput) return null;
  const cleaned = rawInput.trim().toLowerCase();
  if (!cleaned) return null;

  // 1. Check numeric MCC/MNC network codes
  if (cleaned.includes('62001') || cleaned === '62001') {
    return { canonicalName: 'MTN', networkCode: '62001' };
  }
  if (cleaned.includes('62002') || cleaned === '62002') {
    return { canonicalName: 'Telecel', networkCode: '62002' };
  }
  if (cleaned.includes('62003') || cleaned === '62003') {
    return { canonicalName: 'AT', networkCode: '62003' };
  }
  if (cleaned.includes('62006') || cleaned === '62006') {
    return { canonicalName: 'Glo', networkCode: '62006' };
  }

  // 2. Check string variations
  if (cleaned.includes('telecel') || cleaned.includes('vodafone') || cleaned.includes('voda')) {
    return { canonicalName: 'Telecel', networkCode: '62002' };
  }

  if (cleaned.includes('mtn') || cleaned.includes('scancom')) {
    return { canonicalName: 'MTN', networkCode: '62001' };
  }

  if (cleaned.includes('airteltigo') || cleaned.includes('airtel') || cleaned.includes('tigo') || cleaned === 'at' || cleaned.startsWith('at ') || cleaned.endsWith(' at')) {
    return { canonicalName: 'AT', networkCode: '62003' };
  }

  if (cleaned.includes('glo')) {
    return { canonicalName: 'Glo', networkCode: '62006' };
  }

  return null;
}
