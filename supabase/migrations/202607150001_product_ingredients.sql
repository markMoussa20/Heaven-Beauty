alter table public.products
  add column if not exists ingredients text;

update public.products
set ingredients = 'Aqua/Water/Eau, Glycerin, Aloe Barbadensis Leaf Juice, Phenoxyethanol, Pentylene Glycol, Parfum/Fragrance, Sodium Hyaluronate, Carbomer, Ethylhexylglycerin, PEG-40 Hydrogenated Castor Oil, Butylene Glycol, Potassium Sorbate, Sodium Benzoate, Citric Acid, Mica.'
where ingredients is null or btrim(ingredients) = '';
