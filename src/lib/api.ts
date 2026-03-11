// CFMS API Integration

const BASE_URL = 'https://anuapi.netlify.app/.netlify/functions/api';

export interface ApiEndpoint {
  id: string;
  name: string;
  endpoint: string;
  parameter: string;
  placeholder: string;
  description: string;
  icon: string; // lucide icon name
}

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: 'mobile',
    name: 'Mobile Lookup',
    endpoint: '/mobile',
    parameter: 'number',
    placeholder: 'Enter mobile number',
    description: 'Get details by mobile number',
    icon: 'smartphone',
  },
  {
    id: 'aadhaar',
    name: 'Aadhaar Lookup',
    endpoint: '/aadhaar',
    parameter: 'id',
    placeholder: 'Enter Aadhaar ID',
    description: 'Get details by Aadhaar ID',
    icon: 'fingerprint',
  },
  {
    id: 'gst',
    name: 'GST Lookup',
    endpoint: '/gst',
    parameter: 'number',
    placeholder: 'Enter GST number',
    description: 'Get GST registration details',
    icon: 'receipt',
  },
  {
    id: 'telegram',
    name: 'Telegram Lookup',
    endpoint: '/telegram',
    parameter: 'user',
    placeholder: 'Enter Telegram username',
    description: 'Get Telegram user details',
    icon: 'send',
  },
  {
    id: 'ifsc',
    name: 'IFSC Lookup',
    endpoint: '/ifsc',
    parameter: 'code',
    placeholder: 'Enter IFSC code',
    description: 'Get bank branch details',
    icon: 'landmark',
  },
  {
    id: 'rashan',
    name: 'Ration Card Lookup',
    endpoint: '/rashan',
    parameter: 'aadhaar',
    placeholder: 'Enter Aadhaar number',
    description: 'Get ration card details',
    icon: 'wheat',
  },
  {
    id: 'upi',
    name: 'UPI Lookup',
    endpoint: '/upi',
    parameter: 'id',
    placeholder: 'Enter UPI ID',
    description: 'Get UPI account details',
    icon: 'wallet',
  },
  {
    id: 'upi2',
    name: 'UPI Lookup v2',
    endpoint: '/upi2',
    parameter: 'id',
    placeholder: 'Enter UPI ID',
    description: 'Get extended UPI details',
    icon: 'credit-card',
  },
  {
    id: 'vehicle',
    name: 'Vehicle Lookup',
    endpoint: '/vehicle',
    parameter: 'registration',
    placeholder: 'Enter registration number',
    description: 'Get vehicle registration details',
    icon: 'car',
  },
  {
    id: 'v2',
    name: 'General Query',
    endpoint: '/v2',
    parameter: 'query',
    placeholder: 'Enter search query',
    description: 'General purpose search',
    icon: 'search',
  },
  {
    id: 'pan',
    name: 'PAN Lookup',
    endpoint: '/pan',
    parameter: 'pan',
    placeholder: 'Enter PAN number',
    description: 'Get PAN card details',
    icon: 'id-card',
  },
  {
    id: 'email',
    name: 'Email Lookup',
    endpoint: '/email',
    parameter: 'address',
    placeholder: 'Enter email address',
    description: 'Get details by email address',
    icon: 'mail',
  },
];

export interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  endpoint: string;
  parameter: string;
  value: string;
  timestamp: string;
}

export const fetchApiData = async (
  endpoint: ApiEndpoint,
  value: string
): Promise<ApiResponse> => {
  const url = `${BASE_URL}${endpoint.endpoint}?${endpoint.parameter}=${encodeURIComponent(value)}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    return {
      success: true,
      data,
      endpoint: endpoint.endpoint,
      parameter: endpoint.parameter,
      value,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      endpoint: endpoint.endpoint,
      parameter: endpoint.parameter,
      value,
      timestamp: new Date().toISOString(),
    };
  }
};
