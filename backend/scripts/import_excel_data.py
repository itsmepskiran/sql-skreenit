"""
Import Excel data into MySQL database.
Run: python backend/scripts/import_excel_data.py
"""

import pandas as pd
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text
import uuid

EXCEL_PATH = "database/dpts_dsgnts.xlsx"
COUNTRIES_PATH = "database/Skreenit_Global_Countries.xlsx"
STATES_PATH = "database/Skreenit_Global_States.xlsx"

def import_departments():
    """Import departments from Excel."""
    df = pd.read_excel(EXCEL_PATH, sheet_name='Departments')
    print(f"Found {len(df)} departments")
    
    with engine.connect() as conn:
        for _, row in df.iterrows():
            dept_id = str(row.get('Department ID', '')).strip()
            dept_name = str(row.get('Department Name', '')).strip()
            
            if not dept_name:
                continue
            
            # Generate UUID if not provided
            if not dept_id or dept_id == 'nan':
                dept_id = str(uuid.uuid4())
            
            # Create slug from name
            slug = dept_name.lower().replace(' ', '-').replace('&', 'and')
            
            try:
                conn.execute(text("""
                    INSERT INTO departments (id, name, slug, is_active, sort_order)
                    VALUES (:id, :name, :slug, TRUE, 0)
                    ON DUPLICATE KEY UPDATE name = :name, slug = :slug
                """), {"id": dept_id, "name": dept_name, "slug": slug})
                print(f"  ✓ {dept_name}")
            except Exception as e:
                print(f"  ✗ {dept_name}: {e}")
        
        conn.commit()
    print("Departments imported successfully!\n")

def import_designations():
    """Import designations/roles from Excel."""
    df = pd.read_excel(EXCEL_PATH, sheet_name='Designations')
    print(f"Found {len(df)} designations")
    
    with engine.connect() as conn:
        for _, row in df.iterrows():
            desig_id = str(row.get('Designation ID', '')).strip()
            dept_id = str(row.get('Department ID', '')).strip()
            level_val = row.get('Level', 0)
            
            # Handle level - could be string like 'E01' or integer
            if pd.notna(level_val):
                try:
                    level = int(level_val) if isinstance(level_val, (int, float)) else 0
                except (ValueError, TypeError):
                    level = 0
            else:
                level = 0
            
            desig_name = str(row.get('Designation Name', '')).strip()
            
            if not desig_name:
                continue
            
            # Generate UUID if not provided
            if not desig_id or desig_id == 'nan':
                desig_id = str(uuid.uuid4())
            
            # Create slug from name
            slug = desig_name.lower().replace(' ', '-').replace('&', 'and').replace('/', '-')
            
            # Handle department_id - could be None if not linked
            dept_fk = dept_id if dept_id and dept_id != 'nan' else None
            
            try:
                conn.execute(text("""
                    INSERT INTO roles (id, name, slug, department_id, level, is_active, sort_order)
                    VALUES (:id, :name, :slug, :dept_id, :level, TRUE, 0)
                    ON DUPLICATE KEY UPDATE name = :name, slug = :slug, level = :level
                """), {"id": desig_id, "name": desig_name, "slug": slug, "dept_id": dept_fk, "level": level})
                print(f"  ✓ {desig_name} (Level {level})")
            except Exception as e:
                print(f"  ✗ {desig_name}: {e}")
        
        conn.commit()
    print("Designations imported successfully!\n")

def import_countries():
    """Import countries from Excel."""
    df = pd.read_excel(COUNTRIES_PATH)
    print(f"Found {len(df)} countries")
    
    # Create table if not exists
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS countries (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                iso2 VARCHAR(2),
                iso3 VARCHAR(3),
                phonecode VARCHAR(20),
                capital VARCHAR(100),
                currency VARCHAR(50),
                emoji VARCHAR(10),
                region VARCHAR(50),
                subregion VARCHAR(100),
                latitude DECIMAL(10,8),
                longitude DECIMAL(11,8),
                INDEX idx_countries_name (name),
                INDEX idx_countries_iso2 (iso2)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """))
        conn.commit()
    
    with engine.connect() as conn:
        count = 0
        for _, row in df.iterrows():
            name = str(row.get('Common Name', '')).strip()
            official_name = str(row.get('Official Name', '')).strip()
            iso2 = str(row.get('ISO Alpha-2', '')).strip()
            iso3 = str(row.get('ISO Alpha-3', '')).strip()
            continent = str(row.get('Continent', '')).strip()
            
            if not name or name == 'nan':
                continue
            
            # Skip invalid ISO codes
            if iso2 == 'nan' or len(iso2) != 2:
                iso2 = None
            if iso3 == 'nan' or len(iso3) != 3:
                iso3 = None
            if continent == 'nan':
                continent = None
            
            try:
                conn.execute(text("""
                    INSERT INTO countries (name, iso2, iso3, region)
                    VALUES (:name, :iso2, :iso3, :region)
                    ON DUPLICATE KEY UPDATE name = :name, region = :region
                """), {"name": name, "iso2": iso2, "iso3": iso3, "region": continent})
                count += 1
                if count % 50 == 0:
                    print(f"  Imported {count} countries...")
            except Exception as e:
                print(f"  ✗ {name}: {e}")
        
        conn.commit()
    print(f"Countries imported successfully! ({count} records)\n")

def import_states():
    """Import states from Excel."""
    df = pd.read_excel(STATES_PATH)
    print(f"Found {len(df)} states")
    
    # Create table if not exists
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS states (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                country_id INT,
                country_code VARCHAR(2),
                latitude DECIMAL(10,8),
                longitude DECIMAL(11,8),
                INDEX idx_states_country (country_id),
                INDEX idx_states_name (name),
                FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """))
        conn.commit()
    
    # Get country ISO to ID mapping
    with engine.connect() as conn:
        result = conn.execute(text("SELECT id, iso2 FROM countries WHERE iso2 IS NOT NULL"))
        country_map = {row.iso2: row.id for row in result}
    
    with engine.connect() as conn:
        count = 0
        for _, row in df.iterrows():
            country_name = str(row.get('Country', '')).strip()
            country_iso = str(row.get('Country ISO', '')).strip()
            state_name = str(row.get('State/Province Name', '')).strip()
            subdivision = str(row.get('Subdivision Code', '')).strip()
            
            if not state_name or state_name == 'nan':
                continue
            
            # Get country_id from ISO code
            country_id = country_map.get(country_iso if country_iso != 'nan' else None)
            
            if country_iso == 'nan':
                country_iso = None
            
            try:
                conn.execute(text("""
                    INSERT INTO states (name, country_id, country_code)
                    VALUES (:name, :country_id, :country_code)
                    ON DUPLICATE KEY UPDATE name = :name
                """), {"name": state_name, "country_id": country_id, "country_code": country_iso})
                count += 1
                if count % 500 == 0:
                    print(f"  Imported {count} states...")
            except Exception as e:
                print(f"  ✗ {state_name}: {e}")
        
        conn.commit()
    print(f"States imported successfully! ({count} records)\n")

def main():
    print("=" * 50)
    print("Importing Excel Data to MySQL")
    print("=" * 50 + "\n")
    
    try:
        import_departments()
        import_designations()
        import_countries()
        import_states()
        print("All data imported successfully!")
    except FileNotFoundError as e:
        print(f"Error: File not found - {e}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
