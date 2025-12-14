CREATE TABLE IF NOT EXISTS tranzactii_analizate (
  id BIGSERIAL PRIMARY KEY,
  digest TEXT UNIQUE NOT NULL,
  retea TEXT NOT NULL,
  rezumat TEXT,
  scor_risc INT,
  nivel_risc TEXT,
  creat_la TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversatii (
  id BIGSERIAL PRIMARY KEY,
  cheie_sesiune TEXT NOT NULL,
  creat_la TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mesaje (
  id BIGSERIAL PRIMARY KEY,
  conversatie_id BIGINT REFERENCES conversatii(id) ON DELETE CASCADE,
  rol TEXT NOT NULL,
  continut TEXT NOT NULL,
  creat_la TIMESTAMPTZ DEFAULT NOW()
);
