-- LexVora production database schema.
-- Apply this to PostgreSQL before running with DB_CLIENT=postgres.

create table if not exists lawyers (
  id text primary key,
  name text not null,
  phone text not null,
  email text not null,
  specialization text not null,
  city text not null,
  court text not null,
  experience text not null,
  mode text not null,
  summary text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lawyers_specialization_idx on lawyers (specialization);
create index if not exists lawyers_city_idx on lawyers (city);
create index if not exists lawyers_court_idx on lawyers (court);

create table if not exists consultation_requests (
  id text primary key,
  lawyer_id text not null references lawyers(id),
  lawyer_name text not null,
  lawyer_phone text not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  legal_issue text not null,
  gateway text not null,
  payment_option text not null,
  payment_reference text not null,
  fee integer not null default 99,
  status text not null default 'Pending',
  refund_deadline text not null default '48 working hours',
  admin_note text not null,
  sms_status text,
  refund_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consultation_requests_status_idx on consultation_requests (status);
create index if not exists consultation_requests_lawyer_idx on consultation_requests (lawyer_id);
create index if not exists consultation_requests_created_at_idx on consultation_requests (created_at desc);

create table if not exists user_profiles (
  role text not null,
  email text not null,
  profile_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (role, email)
);

create index if not exists user_profiles_role_idx on user_profiles (role);
