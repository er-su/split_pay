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
  created_by: number;
  creator_display_name?: string;
  location_name?: string;
  is_archived: boolean;
}

export interface Member {
  user_id: number;
  group_id: number;
  display_name: string;
  joined_at: string | null;
  left_at: string | null;
  is_admin: boolean;
}

export interface Transaction extends TransactionInput{
  id: number;
  group_id: number;
  creator_id: number;
  creator_display_name: string;
  payer_id: number;
  payer_display_name: string;
  exchange_rate_to_group: number;
  total_amount_cents: string; // this needs to be converted to decimal later
  title: string;
  memo?: string | null;
  currency: string;
  splits: Split[];
}

export interface Due {
  other_user_id: number;
  other_user_display_name: string;
  amount_owed: string;
}

export interface Split extends SplitInput{
  user_id: number;
  user_display_name: string | null;
  amount_cents: string; // this needs to be converted to decimal later
  note?: string;
}

export type TransactionInput = {
  group_id: number;
  payer_id: number;
  exchange_rate_to_group: number;
  total_amount_cents: string; // this needs to be converted to decimal later
  title: string;
  memo?: string | null;
  currency: string;
  splits: SplitInput[];
}

export type SplitInput = {
  user_id: number;
  amount_cents: string  // local numeric representation
  note?: string;
};
