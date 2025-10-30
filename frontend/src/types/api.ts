export interface User {
  id: number;
  email: string;
  display_name: string;
}

export interface Group {
  id: number;
  name: string;
  description?: string;
  base_currency: string;
  created_by?: number;
  location_name?: number;
}

export interface Member {
  user_id: number;
  group_id: number,
  joined_at?: string;
  left_at?: string;
  is_admin: boolean;
}

export interface Transaction {
  id: number;
  group_id: number;
  payer_id: number;
  exchange_rate_to_group: number;
  total_amount_cents: string; // this needs to be converted to decimal later
  title?: string;
  memo?: string;
  currency: string;
  splits: Split[];
}

export interface Split {
  user_id: number;
  amount_cents: string; // this needs to be converted to decimal later
  note?: string;
}