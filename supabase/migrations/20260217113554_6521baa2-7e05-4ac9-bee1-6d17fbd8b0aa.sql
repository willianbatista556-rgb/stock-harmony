-- Add printer configuration columns to empresa_config
ALTER TABLE public.empresa_config
  ADD COLUMN printer_codepage text NOT NULL DEFAULT 'utf8',
  ADD COLUMN printer_baudrate integer NOT NULL DEFAULT 9600;
