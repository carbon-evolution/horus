-- Resolved entity table (used by later fetchers for entity resolution).
create table if not exists company (
  id           text primary key,
  industry     text not null,
  name         text not null,
  ticker       text,
  cik          text,
  wikidata_qid text
);
create index if not exists company_industry_idx on company (industry);

-- Read-model: one JSONB payload per (industry, dataset). The provider reads
-- payload and returns it typed. `industry` may be the sentinel '_global' for
-- industry-independent datasets (sources, chokepoints).
create table if not exists industry_dataset (
  industry   text not null,
  dataset    text not null,
  payload    jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (industry, dataset)
);
