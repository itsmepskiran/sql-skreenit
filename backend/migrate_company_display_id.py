#!/usr/bin/env python3
"""
Migration script to add company_display_id column to companies table
"""

from database import engine, Base
from sqlalchemy import text

def run_migration():
    """Add company_display_id column and update existing records."""
    
    with engine.connect() as conn:
        try:
            # Check if column already exists
            result = conn.execute(text("""
                SELECT COUNT(*) as count 
                FROM information_schema.columns 
                WHERE table_name = 'companies' 
                AND column_name = 'company_display_id'
                AND table_schema = DATABASE()
            """))
            
            column_exists = result.fetchone()[0] > 0
            
            if not column_exists:
                print("Adding company_display_id column...")
                conn.execute(text("ALTER TABLE companies ADD COLUMN company_display_id VARCHAR(20) NULL"))
                print("✅ Added company_display_id column")
                
                print("Creating index...")
                conn.execute(text("CREATE INDEX idx_companies_display_id ON companies(company_display_id)"))
                print("✅ Created index")
                
                print("Updating existing records...")
                # Generate display IDs for existing companies
                conn.execute(text("""
                    UPDATE companies 
                    SET company_display_id = CONCAT('SKR-', LPAD(SUBSTRING(id, 1, 8), 8, '0'))
                    WHERE company_display_id IS NULL
                """))
                print("✅ Updated existing records")
                
                conn.commit()
                print("🎉 Migration completed successfully!")
            else:
                print("✅ company_display_id column already exists")
                
        except Exception as e:
            print(f"❌ Migration failed: {str(e)}")
            conn.rollback()
            raise

if __name__ == "__main__":
    run_migration()
