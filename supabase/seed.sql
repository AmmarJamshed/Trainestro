-- Seed providers for Trainestro (run after init migration)

insert into public.providers (
  id, slug, name, website, listing_url, country_code, city, province,
  description, scraper_key, scraper_enabled, contact_email, contact_phone, reputation_score
) values
(
  '11111111-1111-1111-1111-111111111001',
  'nibaf-pakistan',
  'NIBAF Pakistan',
  'https://nibaf.sbp.org.pk/',
  'https://nibaf.sbp.org.pk/',
  'PK', 'Islamabad', 'Islamabad Capital Territory',
  'National Institute of Banking and Finance — SBP subsidiary.',
  'nibaf', true, 'registration@nibaf.gov.pk', '051-9269850', 95
),
(
  '11111111-1111-1111-1111-111111111002',
  'learning-resource-centre',
  'Learning Resource Centre (LRC)',
  'https://learningresourcecentre.com/',
  'https://learningresourcecentre.com/',
  'PK', 'Karachi', 'Sindh',
  'Professional training and consultancy for financial and non-financial sectors.',
  'lrc', true, null, null, 80
),
(
  '11111111-1111-1111-1111-111111111003',
  'atomcamp',
  'atomcamp',
  'https://www.atomcamp.com/',
  'https://www.atomcamp.com/',
  'PK', 'Islamabad', 'Islamabad Capital Territory',
  'Live AI, data science, and automation bootcamps.',
  'atomcamp', true, null, null, 88
),
(
  '11111111-1111-1111-1111-111111111004',
  'ai-datayard',
  'AI DataYard',
  'https://aidatayard.com/',
  'https://aidatayard.com/bootcamp/generative-ai/',
  'PK', 'Online', null,
  'Live Generative AI bootcamps.',
  'aidatayard', true, null, null, 82
),
(
  '11111111-1111-1111-1111-111111111005',
  'pixelart-games-academy',
  'PixelArt Games Academy',
  'https://pixelartga.com/',
  'https://pixelartga.com/gamelab/',
  'PK', 'Islamabad', 'Islamabad Capital Territory',
  'Game development academy with live online and onsite courses.',
  'pixelart', true, 'info@pixelartga.com', '+92 305 5541499', 85
),
(
  '11111111-1111-1111-1111-111111111006',
  'iba-cee',
  'IBA Center for Executive Education',
  'https://cee.iba.edu.pk/',
  'https://cee.iba.edu.pk/program-calendar.php',
  'PK', 'Karachi', 'Sindh',
  'Executive education workshops from IBA Karachi.',
  'iba-cee', true, 'ceeinfo@iba.edu.pk', '021-38104701', 93
),
(
  '11111111-1111-1111-1111-111111111007',
  'iba-cict',
  'IBA-CICT',
  'https://cict.iba.edu.pk/',
  'https://cict.iba.edu.pk/',
  'PK', 'Karachi', 'Sindh',
  'Cybersecurity, BI, and digital skills programs.',
  'iba-cict', true, null, null, 90
),
(
  '11111111-1111-1111-1111-111111111008',
  'nust-iedc',
  'NUST IEDC / PDC',
  'https://pdc.nust.edu.pk/',
  'https://pdc.nust.edu.pk/',
  'PK', 'Islamabad', 'Islamabad Capital Territory',
  'NUST professional development open-enrollment trainings.',
  'nust-pdc', true, null, null, 92
)
on conflict (id) do nothing;
