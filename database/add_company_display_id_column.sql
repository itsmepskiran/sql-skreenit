-- Add company_display_id column to companies table
ALTER TABLE companies ADD COLUMN company_display_id VARCHAR(20) NULL;

-- Create index for faster lookups
CREATE INDEX idx_companies_display_id ON companies(company_display_id);

-- Show the updated table structure
DESCRIBE companies;
