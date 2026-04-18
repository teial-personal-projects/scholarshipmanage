# Scholarship Finder Implementation Plan

**Goal**: Build an automated scholarship discovery system that finds, verifies, and maintains a database of scholarships from multiple sources.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Implementation Steps](#implementation-steps)
5. [AI-Powered Discovery](#ai-powered-discovery)
6. [Deduplication Strategy](#deduplication-strategy)

**See also**: [SCALING_DEPLOYMENT.md](SCALING_DEPLOYMENT.md) for deployment, scheduling, and scaling strategies.

---

## Overview

### Components

1. **Scholarship Finder Service** - Discovers scholarships from multiple sources
2. **Scraper Module** - Scrapes known scholarship websites
3. **AI Discovery Module** - Uses AI to find scholarships from non-traditional sources
4. **Deduplication Engine** - Prevents duplicate scholarships
5. **Expiration Manager** - Marks and hides expired scholarships
6. **Job Scheduler** - Runs discovery jobs at intervals

### Tech Stack Decision

**Recommendation: Keep Python for Scholarship Finder, Integrate with Node.js API**

**Why Python:**
- Your existing scraper is already in Python and working well
- Better AI/ML libraries (OpenAI SDK, Beautiful Soup, Selenium)
- Excellent scraping ecosystem
- Easier data processing

**Integration Strategy:**
- Scholarship Finder runs as a standalone Python service
- Writes directly to the same PostgreSQL/MySQL database
- Node.js API reads from the same scholarships table
- Communication through shared database (no HTTP calls needed)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Scholarship Finder Service               │
│                         (Python)                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Scraper    │  │ AI Discovery │  │  Expiration  │     │
│  │   Module     │  │    Module    │  │   Manager    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                 │                   │             │
│         └─────────────────┼───────────────────┘             │
│                           ▼                                  │
│                  ┌──────────────────┐                       │
│                  │  Deduplication   │                       │
│                  │     Engine       │                       │
│                  └──────────────────┘                       │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            ▼
                ┌─────────────────────────┐
                │   PostgreSQL/MySQL      │
                │   (Shared Database)     │
                │                         │
                │  - scholarships         │
                │  - scholarship_sources  │
                │  - finder_jobs          │
                │  - user_scholarships    │
                └─────────────────────────┘
                            ▲
                            │
┌───────────────────────────┼──────────────────────────────────┐
│              Node.js API Server (Existing)                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Scholarship  │  │    Search    │  │    User      │     │
│  │    API       │  │     API      │  │  Preferences │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
                            ▼
                    ┌───────────────┐
                    │  React Web    │
                    │   Frontend    │
                    └───────────────┘
```

---

## Database Schema

### New Tables

#### 1. `scholarships` Table
```sql
CREATE TABLE scholarships (
  id SERIAL PRIMARY KEY,

  -- Core Information
  name VARCHAR(500) NOT NULL,
  organization VARCHAR(300),
  amount DECIMAL(10, 2),
  description TEXT,
  eligibility TEXT,
  requirements TEXT,

  -- URLs
  url TEXT NOT NULL UNIQUE, -- Primary URL for deduplication
  application_url TEXT,
  source_url TEXT, -- Where we found it

  -- Dates
  deadline DATE,
  deadline_type VARCHAR(50), -- 'fixed', 'rolling', 'varies'
  recurring BOOLEAN DEFAULT FALSE, -- Annual scholarship

  -- Classification
  category VARCHAR(100), -- STEM, Business, etc.
  target_type VARCHAR(50), -- Merit, Need-Based, etc.
  education_level VARCHAR(100), -- Undergraduate, Graduate, etc.
  field_of_study VARCHAR(200),

  -- Deduplication
  checksum VARCHAR(64) UNIQUE, -- SHA-256 of org+name+amount+deadline

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, expired, invalid
  verified BOOLEAN DEFAULT FALSE,

  -- Metadata
  source_type VARCHAR(50), -- 'scraper', 'ai_discovery', 'manual'
  source_name VARCHAR(100), -- Which scraper/source found it
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_verified_at TIMESTAMP,
  expires_at TIMESTAMP, -- Auto-calculated from deadline

  -- Search Optimization
  search_vector TSVECTOR, -- For full-text search

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_scholarships_checksum ON scholarships(checksum);
CREATE INDEX idx_scholarships_status ON scholarships(status);
CREATE INDEX idx_scholarships_deadline ON scholarships(deadline);
CREATE INDEX idx_scholarships_category ON scholarships(category);
CREATE INDEX idx_scholarships_organization ON scholarships(organization);
CREATE INDEX idx_scholarships_search_vector ON scholarships USING GIN(search_vector);
CREATE INDEX idx_scholarships_expires_at ON scholarships(expires_at);
```

#### 2. `scholarship_sources` Table
```sql
CREATE TABLE scholarship_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  url TEXT NOT NULL,
  source_type VARCHAR(50), -- 'website', 'search_engine', 'api'

  -- Scraping Configuration
  scraper_class VARCHAR(100), -- Python class name
  enabled BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 5, -- 1-10, higher = more important

  -- Rate Limiting
  rate_limit_per_hour INTEGER DEFAULT 100,
  last_scraped_at TIMESTAMP,

  -- Performance Metrics
  total_scholarships_found INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 2) DEFAULT 100.00,
  average_response_time INTEGER, -- milliseconds

  -- Status
  status VARCHAR(50) DEFAULT 'active',
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. `finder_jobs` Table
```sql
CREATE TABLE finder_jobs (
  id SERIAL PRIMARY KEY,
  job_type VARCHAR(50) NOT NULL, -- 'scraper', 'ai_discovery', 'expiration_check'
  source_id INTEGER REFERENCES scholarship_sources(id),

  -- Execution
  status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_seconds INTEGER,

  -- Results
  scholarships_found INTEGER DEFAULT 0,
  scholarships_new INTEGER DEFAULT 0,
  scholarships_updated INTEGER DEFAULT 0,
  scholarships_expired INTEGER DEFAULT 0,

  -- Error Handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Metadata
  config JSONB, -- Job-specific configuration
  results JSONB, -- Detailed results

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_finder_jobs_status ON finder_jobs(status);
CREATE INDEX idx_finder_jobs_created_at ON finder_jobs(created_at);
```

#### 4. `user_scholarships` Table
```sql
CREATE TABLE user_scholarships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scholarship_id INTEGER NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,

  -- Status
  status VARCHAR(50) DEFAULT 'suggested', -- suggested, viewed, saved, applied, dismissed

  -- Interaction
  viewed_at TIMESTAMP,
  saved_at TIMESTAMP,
  dismissed_at TIMESTAMP,
  notes TEXT,

  -- Matching
  match_score DECIMAL(5, 2), -- 0-100, how well it matches user preferences
  match_reasons JSONB, -- Why it was suggested

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, scholarship_id)
);

CREATE INDEX idx_user_scholarships_user_id ON user_scholarships(user_id);
CREATE INDEX idx_user_scholarships_status ON user_scholarships(status);
CREATE INDEX idx_user_scholarships_match_score ON user_scholarships(match_score);
```

---

## Implementation Steps

### Phase 1: Database Setup & Migration

**Goal**: Set up new tables in the existing database

- [✅] #### Step 1.1: Create Migration Files

```bash
cd scholarship-hub
npm run migration:create add_scholarships_tables
```

Create migration in `api/migrations/`:

```typescript
// api/migrations/YYYYMMDD_add_scholarships_tables.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create scholarships table
  await knex.schema.createTable('scholarships', (table) => {
    table.increments('id').primary();

    // Core information
    table.string('name', 500).notNullable();
    table.string('organization', 300);
    table.decimal('amount', 10, 2);
    table.text('description');
    table.text('eligibility');
    table.text('requirements');

    // URLs
    table.text('url').notNullable().unique();
    table.text('application_url');
    table.text('source_url');

    // Dates
    table.date('deadline');
    table.string('deadline_type', 50);
    table.boolean('recurring').defaultTo(false);

    // Classification
    table.string('category', 100);
    table.string('target_type', 50);
    table.string('education_level', 100);
    table.string('field_of_study', 200);

    // Deduplication
    table.string('checksum', 64).unique();

    // Status
    table.string('status', 50).defaultTo('active');
    table.boolean('verified').defaultTo(false);

    // Metadata
    table.string('source_type', 50);
    table.string('source_name', 100);
    table.timestamp('discovered_at').defaultTo(knex.fn.now());
    table.timestamp('last_verified_at');
    table.timestamp('expires_at');

    table.timestamps(true, true);

    // Indexes
    table.index('checksum');
    table.index('status');
    table.index('deadline');
    table.index('category');
    table.index('organization');
    table.index('expires_at');
  });

  // Create other tables (scholarship_sources, finder_jobs, user_scholarships)
  // ... (similar structure)
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_scholarships');
  await knex.schema.dropTableIfExists('finder_jobs');
  await knex.schema.dropTableIfExists('scholarship_sources');
  await knex.schema.dropTableIfExists('scholarships');
}
```

- [✅] #### Step 1.2: Run Migration

```bash
npm run migrate:latest --workspace=api
```

---

### Phase 2: Move & Integrate Scholarship Finder

**Goal**: Move the Python scholarship finder into the project and configure it

- [✅] #### Step 2.1: Create scholarship-finder Directory

```bash
cd scholarship-hub
mkdir -p scholarship-finder
```

- [✅] #### Step 2.2: Copy Existing Scraper Code

```bash
# Copy from your existing scraper
cp -r /Users/teial/Tutorials/scholarship-tracker/scraper/* scholarship-finder/

# Rename for clarity
mv scholarship-finder/src/scrapers scholarship-finder/src/scholarship_finder
mv scholarship-finder/main.py scholarship-finder/finder_main.py
```

- [✅] #### Step 2.3: Update Database Connection

First, install the Supabase Python library:
```bash
pip install supabase
```

Add to `requirements.txt`:
```txt
supabase>=2.0.0
```

Create `scholarship-finder/src/database/connection.py`:

```python
"""
Database connection for Scholarship Finder
Connects to the same database as the Node.js API
"""
import os
from supabase import create_client
from typing import Optional
from dotenv import load_dotenv

# Load environment from root .env
load_dotenv(os.path.join(os.path.dirname(__file__), '../../../.env'))

class DatabaseConnection:
    def __init__(self):
        self.supabase = None

    def connect(self):
        """Connect to Supabase database (same as Node.js API)"""
        try:
            self.supabase = create_client(
                os.getenv("SUPABASE_URL"),
                os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            )
            return True
        except Exception as e:
            print(f"❌ Database connection error: {e}")
            return False

    def close(self):
        """Close database connection"""
        # Supabase client doesn't require explicit closing
        self.supabase = None

    def insert_scholarship(self, scholarship: dict) -> Optional[int]:
        """Insert or update scholarship"""
        # Implementation in next step
        pass
```

- [✅] #### Step 2.4: Update Dependencies

Create `scholarship-finder/requirements.txt`:

```txt
# Existing dependencies
beautifulsoup4==4.12.2
requests==2.31.0
openai==1.3.0
google-api-python-client==2.108.0
python-dotenv==1.0.0

# Database (PostgreSQL instead of MySQL)
psycopg2-binary==2.9.9

# Scraping
selenium==4.15.0
playwright==1.40.0

# Utilities
tqdm==4.66.1
python-dateutil==2.8.2
```

---

### Phase 3: Implement Deduplication Engine

**Goal**: Prevent duplicate scholarships using checksums and fuzzy matching

- [✅] #### Step 3.1: Create Deduplication Module

Create `scholarship-finder/src/deduplication/engine.py`:

```python
"""
Scholarship Deduplication Engine
Uses checksums and fuzzy matching to prevent duplicates
"""
import hashlib
from typing import Dict, Optional, Tuple
from difflib import SequenceMatcher
from datetime import datetime

class DeduplicationEngine:
    def __init__(self, db_connection):
        self.db = db_connection
        self.similarity_threshold = 0.85  # 85% similarity = duplicate

    def generate_checksum(self, scholarship: dict) -> str:
        """
        Generate SHA-256 checksum from key fields
        Format: org_name + scholarship_name + amount + deadline
        """
        components = [
            (scholarship.get('organization') or '').lower().strip(),
            (scholarship.get('name') or '').lower().strip(),
            str(scholarship.get('amount') or '0'),
            str(scholarship.get('deadline') or '')
        ]

        checksum_string = '|'.join(components)
        return hashlib.sha256(checksum_string.encode()).hexdigest()

    def check_duplicate(self, scholarship: dict) -> Tuple[bool, Optional[int]]:
        """
        Check if scholarship is a duplicate
        Returns: (is_duplicate, existing_id)
        """
        # 1. Check exact checksum match (fastest)
        checksum = self.generate_checksum(scholarship)

        self.db.cursor.execute(
            "SELECT id FROM scholarships WHERE checksum = %s AND status != 'invalid'",
            (checksum,)
        )
        result = self.db.cursor.fetchone()
        if result:
            return (True, result['id'])

        # 2. Check URL match (second fastest)
        if scholarship.get('url'):
            self.db.cursor.execute(
                "SELECT id FROM scholarships WHERE url = %s AND status != 'invalid'",
                (scholarship['url'],)
            )
            result = self.db.cursor.fetchone()
            if result:
                return (True, result['id'])

        # 3. Fuzzy match on name + organization (slowest, but catches variations)
        similar_id = self._find_similar_scholarship(scholarship)
        if similar_id:
            return (True, similar_id)

        return (False, None)

    def _find_similar_scholarship(self, scholarship: dict) -> Optional[int]:
        """
        Find similar scholarships using fuzzy string matching
        Only checks recent scholarships for performance
        """
        org = (scholarship.get('organization') or '').lower().strip()
        name = (scholarship.get('name') or '').lower().strip()

        if not org or not name:
            return None

        # Only check scholarships from same organization
        self.db.cursor.execute("""
            SELECT id, name, organization
            FROM scholarships
            WHERE LOWER(organization) LIKE %s
            AND status != 'invalid'
            AND discovered_at > NOW() - INTERVAL '6 months'
            LIMIT 50
        """, (f'%{org}%',))

        candidates = self.db.cursor.fetchall()

        for candidate in candidates:
            candidate_name = (candidate['name'] or '').lower().strip()
            candidate_org = (candidate['organization'] or '').lower().strip()

            # Calculate similarity scores
            name_similarity = SequenceMatcher(None, name, candidate_name).ratio()
            org_similarity = SequenceMatcher(None, org, candidate_org).ratio()

            # Weighted average (name is more important)
            overall_similarity = (name_similarity * 0.7) + (org_similarity * 0.3)

            if overall_similarity >= self.similarity_threshold:
                return candidate['id']

        return None

    def merge_scholarship_data(self, existing: dict, new: dict) -> dict:
        """
        Merge new scholarship data with existing
        Keeps most complete/recent information
        """
        merged = existing.copy()

        # Update fields if new data is more complete
        for field in ['description', 'eligibility', 'requirements',
                      'application_url', 'amount']:
            if new.get(field) and not existing.get(field):
                merged[field] = new[field]
            elif new.get(field) and len(str(new[field])) > len(str(existing.get(field, ''))):
                merged[field] = new[field]

        # Always update deadline if it's newer
        if new.get('deadline'):
            new_deadline = new['deadline']
            existing_deadline = existing.get('deadline')
            if not existing_deadline or new_deadline > existing_deadline:
                merged['deadline'] = new_deadline

        # Update last_verified timestamp
        merged['last_verified_at'] = datetime.utcnow()

        return merged
```

---

### Phase 4: Implement AI-Powered Discovery

**Goal**: Use AI to discover scholarships from non-traditional sources

- [x] ✅ #### Step 4.1: Create AI Discovery Module

Create `scholarship-finder/src/ai_discovery/discovery_engine.py`:

```python
"""
AI-Powered Scholarship Discovery
Finds scholarships from businesses, organizations, and non-traditional sources
"""
import os
from typing import List, Dict, Optional
from openai import OpenAI
import requests
from bs4 import BeautifulSoup
import json

class AIDiscoveryEngine:
    def __init__(self, db_connection):
        self.db = db_connection
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.google_api_key = os.getenv('GOOGLE_API_KEY')
        self.google_cx = os.getenv('GOOGLE_CUSTOM_SEARCH_CX')

    def generate_search_queries(self, category: str, keywords: List[str]) -> List[str]:
        """
        Use GPT to generate targeted search queries for a category
        """
        prompt = f"""
Generate 5 Google search queries to find scholarship opportunities in the {category} industry.

Focus on:
- Company scholarships
- Professional association scholarships
- Industry-specific scholarships
- Lesser-known opportunities

Keywords to incorporate: {', '.join(keywords)}

Return ONLY the search queries, one per line, without numbering or explanation.
"""

        response = self.client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a scholarship research assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=200
        )

        queries = response.choices[0].message.content.strip().split('\n')
        return [q.strip().strip('"').strip("'") for q in queries if q.strip()]

    def search_google(self, query: str, num_results: int = 10) -> List[Dict]:
        """
        Search Google using Custom Search API
        """
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            'key': self.google_api_key,
            'cx': self.google_cx,
            'q': query,
            'num': num_results
        }

        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            results = []
            for item in data.get('items', []):
                results.append({
                    'title': item.get('title'),
                    'url': item.get('link'),
                    'snippet': item.get('snippet')
                })

            return results
        except Exception as e:
            print(f"⚠️  Google search error: {e}")
            return []

    def verify_scholarship_page(self, url: str, html: str) -> bool:
        """
        Use AI to verify if a page actually contains scholarship information
        """
        # Extract text content
        soup = BeautifulSoup(html, 'html.parser')

        # Remove scripts, styles, etc.
        for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
            tag.decompose()

        text = soup.get_text(separator=' ', strip=True)
        text = ' '.join(text.split())[:3000]  # Limit to 3000 chars

        prompt = f"""
Analyze this webpage text and determine if it describes a scholarship, grant, or financial aid opportunity.

URL: {url}
Text: {text}

Respond with ONLY "YES" or "NO".

YES if:
- Describes a specific scholarship/grant with clear eligibility
- Has application information or deadlines
- Offers financial assistance for education

NO if:
- General scholarship search/database site
- Blog post or news article about scholarships
- Loan information or paid services
- No specific scholarship details
"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a scholarship verification assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=10
            )

            answer = response.choices[0].message.content.strip().upper()
            return answer == "YES"
        except Exception as e:
            print(f"⚠️  AI verification error: {e}")
            return False

    def extract_scholarship_data(self, url: str, html: str) -> Optional[Dict]:
        """
        Use AI to extract structured scholarship data from HTML
        """
        soup = BeautifulSoup(html, 'html.parser')
        text = soup.get_text(separator=' ', strip=True)
        text = ' '.join(text.split())[:4000]

        prompt = f"""
Extract scholarship information from this webpage.

URL: {url}
Text: {text}

Return a JSON object with these fields (use null for missing data):
{{
  "name": "Scholarship name",
  "organization": "Organization offering it",
  "amount": 1000,
  "deadline": "YYYY-MM-DD or null",
  "deadline_type": "fixed|rolling|varies",
  "description": "Brief description",
  "eligibility": "Who can apply",
  "requirements": "Application requirements",
  "application_url": "URL to apply",
  "category": "STEM|Business|Healthcare|etc",
  "field_of_study": "Specific field if mentioned",
  "education_level": "Undergraduate|Graduate|High School|etc"
}}

Return ONLY valid JSON, no explanation.
"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",  # More capable for extraction
                messages=[
                    {"role": "system", "content": "You extract scholarship data into JSON format."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=800
            )

            json_str = response.choices[0].message.content.strip()

            # Remove markdown code blocks if present
            if json_str.startswith('```'):
                json_str = json_str.split('```')[1]
                if json_str.startswith('json'):
                    json_str = json_str[4:]

            data = json.loads(json_str)
            data['url'] = url
            data['source_url'] = url
            data['source_type'] = 'ai_discovery'

            return data
        except Exception as e:
            print(f"⚠️  AI extraction error: {e}")
            return None

    def discover_scholarships(self, category: str, keywords: List[str],
                            max_results: int = 50) -> List[Dict]:
        """
        Main discovery pipeline for a category
        """
        print(f"\n🔍 Discovering {category} scholarships...")

        # 1. Generate search queries
        queries = self.generate_search_queries(category, keywords)
        print(f"   Generated {len(queries)} search queries")

        scholarships = []
        urls_checked = set()

        # 2. Search and verify
        for query in queries[:3]:  # Limit to 3 queries per category
            print(f"   Searching: {query}")
            search_results = self.search_google(query, num_results=10)

            for result in search_results:
                url = result['url']

                if url in urls_checked or len(scholarships) >= max_results:
                    continue

                urls_checked.add(url)

                # Fetch page
                try:
                    response = requests.get(url, timeout=10, headers={
                        'User-Agent': 'Mozilla/5.0 (compatible; ScholarshipBot/1.0)'
                    })
                    html = response.text

                    # Verify it's a scholarship page
                    if not self.verify_scholarship_page(url, html):
                        continue

                    # Extract data
                    data = self.extract_scholarship_data(url, html)
                    if data:
                        scholarships.append(data)
                        print(f"   ✅ Found: {data.get('name')}")
                except Exception as e:
                    print(f"   ⚠️  Error fetching {url}: {e}")
                    continue

        print(f"   Total found: {len(scholarships)}")
        return scholarships
```

**Note**: This AI discovery approach is cost-effective because:
- Uses GPT-3.5-turbo for search queries (~$0.001 per query)
- Uses GPT-4-turbo for extraction (~$0.01 per page)
- Typical cost per category: $0.50-2.00
- Run monthly: ~$10-40/month for all categories

---

### Phase 5: Expiration Manager

**Goal**: Automatically mark expired scholarships

- [✅]  #### Step 5.1: Create Expiration Manager

Create `scholarship-finder/src/expiration/manager.py`:

```python
"""
Expiration Manager
Automatically marks expired scholarships and archives them
"""
from datetime import datetime, timedelta
from typing import Dict, List

class ExpirationManager:
    def __init__(self, db_connection):
        self.db = db_connection

    def check_and_mark_expired(self) -> Dict[str, int]:
        """
        Check all active scholarships and mark expired ones
        Returns stats on how many were marked
        """
        stats = {
            'checked': 0,
            'marked_expired': 0,
            'errors': 0
        }

        # Find scholarships with past deadlines
        self.db.cursor.execute("""
            UPDATE scholarships
            SET status = 'expired',
                updated_at = NOW()
            WHERE status = 'active'
            AND deadline < CURRENT_DATE
            AND deadline IS NOT NULL
            RETURNING id, name
        """)

        expired = self.db.cursor.fetchall()
        stats['marked_expired'] = len(expired)

        for scholarship in expired:
            print(f"   ⏰ Expired: {scholarship['name']}")

        self.db.connection.commit()

        return stats

    def calculate_expiration_date(self, deadline: datetime) -> datetime:
        """
        Calculate when a scholarship should be marked as expired
        Usually deadline + 30 days grace period
        """
        if not deadline:
            return None

        return deadline + timedelta(days=30)

    def archive_old_expired_scholarships(self, days_old: int = 365) -> int:
        """
        Archive scholarships that have been expired for a long time
        This keeps the database clean
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)

        self.db.cursor.execute("""
            UPDATE scholarships
            SET status = 'archived'
            WHERE status = 'expired'
            AND updated_at < %s
            RETURNING id
        """, (cutoff_date,))

        archived = self.db.cursor.fetchall()
        self.db.connection.commit()

        return len(archived)

    def reactivate_recurring_scholarships(self) -> int:
        """
        Reactivate scholarships that are recurring (annual)
        """
        # This would check if a scholarship is marked as recurring
        # and if a year has passed, create a new entry with updated deadline

        self.db.cursor.execute("""
            SELECT id, name, organization, deadline
            FROM scholarships
            WHERE recurring = true
            AND status = 'expired'
            AND deadline >= CURRENT_DATE - INTERVAL '1 year'
        """)

        recurring = self.db.cursor.fetchall()
        reactivated = 0

        for scholarship in recurring:
            # Check if we already have this scholarship for the next year
            next_year_deadline = scholarship['deadline'].replace(
                year=scholarship['deadline'].year + 1
            )

            self.db.cursor.execute("""
                SELECT id FROM scholarships
                WHERE organization = %s
                AND name = %s
                AND deadline = %s
            """, (scholarship['organization'], scholarship['name'], next_year_deadline))

            if not self.db.cursor.fetchone():
                # Create new entry for next year
                self.db.cursor.execute("""
                    INSERT INTO scholarships (
                        name, organization, deadline, recurring, status
                    ) VALUES (%s, %s, %s, true, 'active')
                """, (scholarship['name'], scholarship['organization'], next_year_deadline))
                reactivated += 1

        self.db.connection.commit()
        return reactivated
```

---

> **Note**: For job scheduling, deployment strategies, scaling approaches, and cost optimization, see [SCALING_DEPLOYMENT.md](SCALING_DEPLOYMENT.md).

---

---

## Scraper Integration Details

**Status**: This section contains all scraper-related implementation details. The scraper integration will be revisited once the core scholarship application tracking features are stable.

### Scraper Code Location

- **Location**: `scholarship-finder/src/`
- **Language**: Python
- **Features**: AI discovery scraper logic, web scrapers, deduplication, expiration management
- **Status**: Already integrated into the project (migrated in Phase 2)

### Project Structure (Scraper Components)

```
scholarship-hub/
├── scholarship-finder/          # Python scholarship scraper
│   ├── requirements.txt
│   ├── FINDER.md
│   ├── finder_main.py
│   ├── src/
│   │   ├── ai_discovery/        # AI-powered discovery
│   │   │   └── discovery_engine.py
│   │   ├── ai_discovery_scraper.py
│   │   ├── base_scraper.py
│   │   ├── careeronestop_scraper.py
│   │   ├── collegescholarship_scraper.py
│   │   ├── general_scraper.py
│   │   ├── config/              # Configuration files
│   │   │   ├── config_loader.py
│   │   │   └── source_categories.json
│   │   ├── database/             # Database connection
│   │   │   └── connection.py
│   │   ├── deduplication/       # Deduplication engine
│   │   │   └── engine.py
│   │   ├── expiration/          # Expiration manager
│   │   │   └── manager.py
│   │   └── utils_python/        # Utility functions
│   ├── scripts/
│   │   ├── run-finder.sh        # Manual run script
│   │   └── setup-cron.sh       # Cron setup script
│   └── tests/
```

### Migration Steps

- [✅] #### 8.1: Review Existing Scraper

- [✅] Scraper code is already in `scholarship-finder/src/` (migrated in Phase 2)
- [✅] Files are organized in the src directory:
  - Scrapers: `ai_discovery_scraper.py`, `careeronestop_scraper.py`, `collegescholarship_scraper.py`, `general_scraper.py`
  - AI Discovery: `src/ai_discovery/discovery_engine.py`
  - Database: `src/database/connection.py` (updated for Supabase)
  - Deduplication: `src/deduplication/engine.py`
  - Expiration: `src/expiration/manager.py`
  - Config: `src/config/` with category configuration
- [✅] Database connection updated for Supabase PostgreSQL (Step 2.3)
- [✅] Dependencies updated in `requirements.txt` (Step 2.4)

- [✅] #### 8.2: Update Scraper to Use PostgreSQL

- [✅] Verified PostgreSQL driver `psycopg>=3.1.0` is installed in requirements.txt
- [✅] Updated database connection to use Supabase PostgreSQL connection string from `.env.local`
- [✅] Implemented `insert_scholarship()` method with proper table schema matching migration 012
- [✅] Added helper methods: `update_scholarship()`, `get_scholarship_by_url()`, `get_scholarship_by_checksum()`
- [✅] Implemented upsert logic (INSERT ... ON CONFLICT) to handle duplicate URLs gracefully
- [✅] Added automatic checksum generation with fallback for cases where deduplication engine isn't available
- [✅] Created and successfully ran test script to verify database connection
- [✅] Using existing `.env.local` file (not creating new .env) with DATABASE_URL, OPENAI_API_KEY, GOOGLE_CUSTOM_SEARCH_CX, and GOOGLE_API_KEY

- [✅] #### 8.3: Implement Enhanced Deduplication (UPDATED with Expiration Filtering & Date Normalization)

The deduplication engine is fully implemented in [src/deduplication/engine.py](scholarship-finder/src/deduplication/engine.py:1-147) with:

**✅ Features Implemented:**
- **Checksum/Fingerprint Generation**: SHA-256 hash of (organization + name + amount + deadline)
  - Handles both legacy `amount` field and new `min_award`/`max_award` fields
  - Case-insensitive and whitespace-normalized for consistency
- **Three-Layer Duplicate Detection**:
  1. **Exact checksum match** (fastest) - detects identical scholarships
  2. **URL matching** (fast) - detects same scholarship from different sources
  3. **Fuzzy string matching** (slower, comprehensive) - detects similar scholarships with name variations
    - Uses SequenceMatcher with 85% similarity threshold
    - Weighted: name (70%) + organization (30%)
    - Only checks scholarships from same organization discovered in last 6 months (performance optimization)
- **Smart Data Merging**: `merge_scholarship_data()` method
  - Keeps most complete information (longer descriptions, more details)
  - Updates to newer deadlines
  - Preserves all existing data, only adds missing fields
  - Handles both legacy and new schema fields
- **Integration with Database**:
  - `check_duplicate()` returns (is_duplicate, existing_id)
  - `insert_scholarship()` automatically generates checksums if not provided
  - Upsert logic prevents duplicate entries

**✅ Testing:**
- Created comprehensive test suite: [test_deduplication.py](scholarship-finder/test_deduplication.py:1-259)
- All 4 test categories passed:
  1. ✅ Checksum generation (including legacy field compatibility)
  2. ✅ Exact duplicate detection (checksum + URL)
  3. ✅ Fuzzy matching (detects similar scholarships)
  4. ✅ Data merging (preserves complete information)

**✅ NEW: Date Normalization & Expiration Filtering:**
- Created [src/utils_python/date_utils.py](scholarship-finder/src/utils_python/date_utils.py:1-134) for smart date handling:
  - **Dates without years** (e.g., "March 15") → automatically adds current or next year
  - **Month + year only** (e.g., "March 2025") → defaults to 1st of month
  - **Full dates** → preserves original date
  - **Expiration calculation** → automatically calculates `expires_at` (deadline + 30 days grace period)
- **Expired scholarships excluded** from deduplication:
  - `check_duplicate()` only checks scholarships with `status = 'active'`
  - Allows re-adding expired scholarships with updated deadlines
  - Expired scholarships won't block new entries
- **Automatic date normalization** in `insert_scholarship()`:
  - All deadlines normalized before storage
  - `expires_at` calculated automatically
  - Invalid dates handled gracefully with warnings

**✅ Testing:**
- [test_deduplication.py](scholarship-finder/test_deduplication.py:1-259) - 4/4 tests passed
- [test_date_normalization.py](scholarship-finder/test_date_normalization.py:1-324) - 6/6 tests passed including:
  1. ✅ Partial date handling (no year)
  2. ✅ Month+year defaults to 1st
  3. ✅ Full date parsing
  4. ✅ Expiration logic
  5. ✅ Database integration
  6. ✅ Expired scholarship exclusion

**Usage Example:**
```python
from database.connection import DatabaseConnection
from deduplication.engine import DeduplicationEngine

db = DatabaseConnection()
db.connect()

# Example: Insert scholarship with partial date
scholarship = {
    'name': 'Summer Scholarship',
    'organization': 'ABC Foundation',
    'url': 'https://example.com/scholarship',
    'deadline': 'June 15',  # No year! Will auto-add current/next year
    'min_award': 5000,
    'category': 'STEM'
}

# Date is automatically normalized, expires_at calculated
scholarship_id = db.insert_scholarship(scholarship)

# Check for duplicates (only active scholarships checked)
dedup = DeduplicationEngine(db)
is_duplicate, existing_id = dedup.check_duplicate(scholarship)

if is_duplicate:
    # Merge and update existing
    existing = db.get_scholarship_by_url(scholarship['url'])
    merged = dedup.merge_scholarship_data(existing, scholarship)
    db.update_scholarship(existing_id, merged)
else:
    # Insert new scholarship
    db.insert_scholarship(scholarship)
```

- [✅] #### 8.4: Migrate Source Categories to Database

**Goal**: Move `source_categories.json` configuration to database for better management and dynamic updates

**Current State**: ✅ Categories successfully migrated to database `scraper_categories` table with auto-generated IDs

**Original JSON**: [src/config/source_categories.json](scholarship-finder/src/config/source_categories.json:1-107) (kept as fallback)

**Why Migrate to Database:**
- Enable/disable categories without code changes
- Add new categories through admin interface
- Track category usage and performance
- Allow user-specific category preferences
- Synchronize categories across multiple scraper instances

#### Step 8.4.1: Create Database Migration for Category Tables

Create new migration: `api/src/migrations/013_add_category_tables.sql`

```sql
-- ============================================================================
-- Scraper Categories Table
-- Stores categories for scholarship discovery (STEM, Arts, Healthcare, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS scraper_categories (
  id SERIAL PRIMARY KEY,

  -- Category Info
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,  -- URL-friendly identifier
  description TEXT,

  -- Configuration
  enabled BOOLEAN DEFAULT TRUE,  -- Whether to scrape this category
  priority INTEGER DEFAULT 5,    -- 1-10, higher = more important

  -- Search Keywords (for AI discovery)
  keywords JSONB DEFAULT '[]'::jsonb,  -- Array of search keywords

  -- Performance Metrics
  total_scholarships_found INTEGER DEFAULT 0,
  last_scraped_at TIMESTAMP,
  average_success_rate DECIMAL(5, 2) DEFAULT 0.00,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scraper_categories_enabled ON scraper_categories(enabled);
CREATE INDEX IF NOT EXISTS idx_scraper_categories_slug ON scraper_categories(slug);
CREATE INDEX IF NOT EXISTS idx_scraper_categories_priority ON scraper_categories(priority DESC);

-- Enable Row Level Security
ALTER TABLE scraper_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view categories (for frontend)
CREATE POLICY "Anyone can view categories"
  ON scraper_categories
  FOR SELECT
  USING (true);

-- Admin can manage categories (using service role key)

COMMENT ON TABLE scraper_categories IS 'Manages scholarship discovery categories and their search keywords';

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================
CREATE TRIGGER update_scraper_categories_updated_at
  BEFORE UPDATE ON scraper_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Seed Data: Migrate from source_categories.json
-- ============================================================================
INSERT INTO scraper_categories (name, slug, enabled, priority, keywords)
VALUES
  (
    'STEM',
    'stem',
    true,
    10,
    '["engineering", "computer science", "information technology", "cybersecurity", "data science", "artificial intelligence", "machine learning", "robotics", "STEM", "Science", "Math"]'::jsonb
  ),
  (
    'Arts',
    'arts',
    true,
    8,
    '["art", "arts", "fine arts", "visual arts", "graphic design", "painting", "sculpture", "photography", "digital art", "art history", "studio art", "creative arts"]'::jsonb
  ),
  (
    'Music',
    'music',
    true,
    8,
    '["music", "music education", "music performance", "music theory", "music composition", "orchestra", "band", "choir", "jazz", "music production", "audio engineering", "sound design"]'::jsonb
  ),
  (
    'Healthcare & Medical',
    'healthcare-medical',
    false,
    7,
    '["healthcare", "medical", "hospital", "biomedical", "registered nurse", "nursing", "nursing school"]'::jsonb
  ),
  (
    'Financial Services',
    'financial-services',
    false,
    6,
    '["economics", "financial", "banking", "insurance", "investment", "finance"]'::jsonb
  ),
  (
    'Law',
    'law',
    false,
    7,
    '["law", "legal", "law school", "jurisprudence", "attorney", "lawyer", "paralegal", "legal studies", "pre-law", "criminal justice", "criminal law", "corporate law", "forensics"]'::jsonb
  )
ON CONFLICT (slug) DO NOTHING;
```

#### Step 8.4.2: Run the Migration

```bash
cd api
npm run migrate:latest
# Or if using a specific migration command:
# npm run migrate:up -- 013_add_category_tables.sql
```

#### Step 8.4.3: Create Python Database Helper for Categories

Create `scholarship-finder/src/database/category_manager.py`:

```python
"""
Category Manager for Scholarship Finder
Retrieves category configuration from database instead of JSON file
"""
from typing import List, Dict, Optional


class CategoryManager:
    def __init__(self, db_connection):
        self.db = db_connection
        self._cache = None  # Simple in-memory cache
        self._cache_timestamp = None

    def get_enabled_categories(self, refresh_cache: bool = False) -> List[Dict]:
        """
        Get all enabled categories from database

        Returns:
            List of category dictionaries with id, name, slug, keywords, priority
        """
        # Simple cache to avoid repeated DB queries
        import time
        current_time = time.time()
        cache_duration = 300  # 5 minutes

        if not refresh_cache and self._cache and self._cache_timestamp:
            if current_time - self._cache_timestamp < cache_duration:
                return self._cache

        try:
            self.db.cursor.execute("""
                SELECT
                    id,
                    name,
                    slug,
                    description,
                    enabled,
                    priority,
                    keywords,
                    total_scholarships_found,
                    last_scraped_at
                FROM scraper_categories
                WHERE enabled = true
                ORDER BY priority DESC, name ASC
            """)

            categories = self.db.cursor.fetchall()

            # Convert JSONB keywords to Python list
            result = []
            for cat in categories:
                result.append({
                    'id': cat['id'],
                    'name': cat['name'],
                    'slug': cat['slug'],
                    'description': cat['description'],
                    'enabled': cat['enabled'],
                    'priority': cat['priority'],
                    'keywords': cat['keywords'] if isinstance(cat['keywords'], list) else [],
                    'total_scholarships_found': cat['total_scholarships_found'],
                    'last_scraped_at': cat['last_scraped_at']
                })

            # Update cache
            self._cache = result
            self._cache_timestamp = current_time

            return result

        except Exception as e:
            print(f"❌ Error fetching categories from database: {e}")
            # Fallback: return empty list or load from JSON
            return []

    def get_category_by_slug(self, slug: str) -> Optional[Dict]:
        """Get a specific category by slug"""
        categories = self.get_enabled_categories()
        for cat in categories:
            if cat['slug'] == slug:
                return cat
        return None

    def get_category_keywords(self, category_slug: str) -> List[str]:
        """Get keywords for a specific category"""
        category = self.get_category_by_slug(category_slug)
        if category:
            return category.get('keywords', [])
        return []

    def update_category_stats(self, category_id: int, scholarships_found: int):
        """Update category statistics after scraping"""
        try:
            self.db.cursor.execute("""
                UPDATE scraper_categories
                SET
                    total_scholarships_found = total_scholarships_found + %s,
                    last_scraped_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (scholarships_found, category_id))

            self.db.connection.commit()

            # Invalidate cache
            self._cache = None

        except Exception as e:
            print(f"❌ Error updating category stats: {e}")
            self.db.connection.rollback()

    def get_all_categories_with_stats(self) -> List[Dict]:
        """Get all categories (including disabled) with full statistics"""
        try:
            self.db.cursor.execute("""
                SELECT
                    id,
                    name,
                    slug,
                    description,
                    enabled,
                    priority,
                    keywords,
                    total_scholarships_found,
                    last_scraped_at,
                    average_success_rate,
                    created_at,
                    updated_at
                FROM scraper_categories
                ORDER BY priority DESC, name ASC
            """)

            return self.db.cursor.fetchall()

        except Exception as e:
            print(f"❌ Error fetching all categories: {e}")
            return []
```

#### Step 8.4.4: Update AI Discovery Scraper to Use Database

Update `scholarship-finder/src/ai_discovery_scraper.py` (or wherever categories are used):

```python
from database.category_manager import CategoryManager

class AIDiscoveryScraper:
    def __init__(self, db_connection):
        self.db = db_connection
        self.category_manager = CategoryManager(db_connection)

    def run_discovery(self):
        """Run AI discovery for all enabled categories"""
        # OLD: Load from JSON file
        # with open('src/config/source_categories.json') as f:
        #     config = json.load(f)
        #     categories = [c for c in config['categories'] if c.get('include')]

        # NEW: Load from database
        categories = self.category_manager.get_enabled_categories()

        print(f"🔍 Discovering scholarships for {len(categories)} enabled categories")

        for category in categories:
            print(f"\n📂 Category: {category['name']} (Priority: {category['priority']})")

            # Use category keywords for search
            keywords = category['keywords']
            scholarships_found = self.discover_for_category(
                category['name'],
                keywords
            )

            # Stats are now tracked in finder_jobs table, not in categories
            # See migration 014 for details on the new stats architecture

    def discover_for_category(self, category_name: str, keywords: List[str]) -> int:
        """Discover scholarships for a specific category"""
        # Your existing discovery logic here
        pass
```

#### Step 8.4.5: Migration Checklist

- [✅] Create migration file `013_add_category_tables.sql`
- [✅] Run migration to create `scraper_categories` table
- [✅] Verify seed data matches `source_categories.json`
- [✅] Create `CategoryManager` Python class
- [ ] Update scraper code to use `CategoryManager` instead of JSON file
- [✅] Test that scraper loads categories from database
- [✅] Keep `source_categories.json` as backup/fallback
- [✅] Update documentation

**Note**: Admin API endpoints are documented in [FUTURE.md](FUTURE.md) as a future enhancement

**✅ IMPLEMENTATION COMPLETED:**

**Files Created:**
- [api/src/migrations/013_add_category_tables.sql](api/src/migrations/013_add_category_tables.sql:1-107) - Database migration
- [scholarship-finder/src/database/category_manager.py](scholarship-finder/src/database/category_manager.py:1-261) - CategoryManager class
- [scholarship-finder/test_category_manager.py](scholarship-finder/test_category_manager.py:1-268) - Test suite

**Database Changes:**
- Created `scraper_categories` table with 6 seeded categories
- Auto-generated IDs (SERIAL PRIMARY KEY) - not using JSON file IDs
- 3 enabled categories: STEM, Arts, Music
- 3 disabled categories: Healthcare & Medical, Law, Financial Services

**Test Results:**
All 5/5 tests passed:
1. ✅ Get Enabled Categories (3 found: STEM, Arts, Music)
2. ✅ Get Category by Slug
3. ✅ Get Category Keywords (11 STEM keywords)
4. ✅ Caching (5177x speedup)
5. ✅ Get All Categories (6 total: 3 enabled, 3 disabled)

**CategoryManager Features:**
- `get_enabled_categories()` - Fetch enabled categories with 5-min cache
- `get_category_by_slug()` - Get specific category
- `get_category_by_id()` - Get category by database ID
- `get_category_keywords()` - Get search keywords for category
- `get_all_categories()` - Get all categories (including disabled)
- `_get_from_json_fallback()` - Automatic fallback to JSON if DB unavailable

**Important:** Stats tracking has been moved to `finder_jobs` table (see migration 014)

---

#### Step 8.4.6: Clean Up Stats Architecture (Migration 014)

**Problem:** Stats fields were incorrectly placed in lookup tables (`scraper_categories` and `scholarship_sources`). These tables should ONLY hold configuration, not execution stats.

**Solution:** Created [migration 014](api/src/migrations/014_cleanup_stats_from_lookup_tables.sql:1) to remove stats fields and clarify table responsibilities.

**Table Responsibilities:**

1. **`scraper_categories`** - Category configuration ONLY
   - Fields: name, slug, description, enabled, priority, keywords
   - Purpose: Define what categories to search for
   - No stats fields (removed: total_scholarships_found, last_scraped_at, average_success_rate)

2. **`scholarship_sources`** - Source configuration ONLY
   - Fields: name, url, source_type, scraper_class, enabled, priority, rate_limit_per_hour
   - Purpose: Define which websites to scrape
   - No stats fields (removed: last_scraped_at, total_scholarships_found, success_rate, status, error_count, last_error)

3. **`finder_jobs`** - ALL execution stats
   - Tracks every scraper run (both scrapers and AI discovery)
   - Fields: job_type, source_id, status, started_at, completed_at, scholarships_found, scholarships_new, error_message, etc.
   - Purpose: Historical record of all finder executions

**To get stats now:**
```sql
-- Per category stats
SELECT category, SUM(scholarships_found) as total, COUNT(*) as runs
FROM finder_jobs
GROUP BY category;

-- Per source stats
SELECT source_id, SUM(scholarships_found) as total, AVG(duration_seconds) as avg_duration
FROM finder_jobs
WHERE source_id IS NOT NULL
GROUP BY source_id;

-- Recent runs
SELECT * FROM finder_jobs
ORDER BY created_at DESC
LIMIT 10;
```

**Files Updated:**
- Migration 014 applied successfully
- [CategoryManager](scholarship-finder/src/database/category_manager.py:1) updated - removed `update_category_stats()` method
- [test_category_manager.py](scholarship-finder/test_category_manager.py:1) updated - all tests pass (5/5)

---

**Next Steps:**
- Update AI discovery scraper to use `CategoryManager`
- (Optional) Create admin API endpoints for category management

**Benefits of Database Approach:**
- ✅ Enable/disable categories without redeploying
- ✅ Add new categories through admin UI
- ✅ Track performance per category
- ✅ Dynamic configuration for multiple scraper instances
- ✅ Category-specific analytics and reporting

**Backward Compatibility:**
Keep `source_categories.json` as fallback in case database is unavailable:

```python
def get_enabled_categories(self, refresh_cache: bool = False) -> List[Dict]:
    try:
        # Try database first
        return self._get_from_database()
    except Exception as e:
        print(f"⚠️  Database unavailable, falling back to JSON: {e}")
        # Fallback to JSON file
        return self._get_from_json_file()
```

- [ ] #### 8.5: Enhance Scraper Categories (Additional Improvements)

- [ ] Add category descriptions for better documentation
- [ ] Map categories to existing `field_of_study` values
- [ ] Create category groups (e.g., "Technology" group contains STEM, CS, IT)
- [ ] Add user preferences for favorite categories

- [✅] #### 8.6: Schedule Scraper Runs

**Status**: Setup scripts created. Run `./scripts/setup-cron.sh` when ready to enable scheduled runs.

Created two scripts for scheduling:

1. **`scripts/run-finder.sh`** - Main runner script
   - Loads environment variables from `.env.local`
   - Activates virtual environment
   - Runs finder with logging
   - Captures exit codes
   - Located at: [scholarship-finder/scripts/run-finder.sh](scholarship-finder/scripts/run-finder.sh:1)

2. **`scripts/setup-cron.sh`** - Cron job setup script
   - Installs cron job (runs every 6 hours)
   - Checks for existing entries
   - Creates logs directory
   - Provides instructions for management
   - Located at: [scholarship-finder/scripts/setup-cron.sh](scholarship-finder/scripts/setup-cron.sh:1)

**Usage:**

```bash
# Manual run (test first)
cd scholarship-finder
./scripts/run-finder.sh

# Set up automated cron job (when ready)
./scripts/setup-cron.sh
```

**Schedule**: The cron job runs every 6 hours: `0 */6 * * *`

**Logs**: Stored in `scholarship-finder/logs/finder_YYYYMMDD.log`

**To view/manage cron job:**
```bash
# View current crontab
crontab -l

# Remove cron job
crontab -l | grep -v 'run-finder.sh' | crontab -
```

**Alternative: GitHub Actions** (for cloud-based scheduling)

```yaml
name: Run Scholarship Finder
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:  # Manual trigger

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd scholarship-finder
          pip install -r requirements.txt
      - name: Run finder
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
          GOOGLE_CUSTOM_SEARCH_CX: ${{ secrets.GOOGLE_CUSTOM_SEARCH_CX }}
        run: |
          cd scholarship-finder
          python finder_main.py --mode scheduled
```

> **Note**: Backend scraper stats API documentation has been moved to [FUTURE.md](FUTURE.md) as a future enhancement.

---

## Integration Points

### 1. Scraper → Database

The scraper writes directly to PostgreSQL:
1. Insert raw data into `scholarship_raw_results` (if tracking raw data)
2. Check for duplicates via checksum/fingerprint
3. Insert/update `scholarships` table
4. Update timestamps and metadata

### 2. Backend → Scraper Data

Backend API reads from `scholarships` table:
- Search endpoint uses fingerprint-deduplicated data
- Users see only processed, cleaned scholarships
- Admin endpoints can access raw scraper results for debugging

### 3. User → Scraped Data

Users interact with scraped data through:
- Search & discovery features
- Browse scholarships page
- Saved searches (notify when new scholarships match)

---

## Testing Strategy

### Unit Tests
- Test fingerprint generation with various inputs
- Test deduplication logic
- Test data transformation (raw → processed)

### Integration Tests
- Test database connection
- Test full scrape → store workflow
- Test error handling (network errors, malformed data)

### Manual Testing
- Run scraper on small dataset
- Verify no duplicates created
- Verify data quality in database
- Test scheduled runs

---

## Implementation Status

### ✅ Phase 1 (Basic) - COMPLETED
All Phase 1 objectives have been successfully implemented:
- ✅ Multiple scrapers created (CollegeScholarships.org, CareerOneStop, General scraper)
- ✅ Full PostgreSQL integration with connection pooling and upsert logic
- ✅ Advanced 3-layer deduplication system (checksum, URL, fuzzy matching)
- ✅ Automated scheduled runs via cron (6-hour intervals)

**Key Files**:
- `src/base_scraper.py` - Base scraper architecture
- `src/utils_python/database_manager.py` - PostgreSQL integration
- `src/deduplication/engine.py` - Deduplication system
- `scripts/setup-cron.sh` - Scheduling configuration

### ⚠️ Phase 2 (Enhanced) - MOSTLY COMPLETED
Core Phase 2 features implemented with some advanced features pending:
- ✅ Multiple scholarship sources (4+ scrapers + AI discovery)
- ⚠️ Data quality improvements (text normalization done, advanced ML models pending)
- ✅ Database-backed categorization system with dynamic keyword management
- ⚠️ Basic scholarship verification (URL validation and robots.txt compliance)

**Key Files**:
- `src/source_discovery_engine.py` - AI-powered source discovery
- `src/database/category_manager.py` - Category management
- `src/ethical_crawler.py` - Ethical crawling with robots.txt compliance
- `src/expiration/manager.py` - Scholarship lifecycle management

### 📋 Phase 3 (Advanced) - See FUTURE.md
Advanced features and enhancements have been moved to `FUTURE.md` for future development:
- User-requested sources
- Real-time scraping triggers (beyond scheduled cron)
- Content change detection (beyond expiration tracking)
- Quality scoring algorithm
- Community-contributed sources
- Advanced ML-based data validation
- Deep content verification

See [FUTURE.md](FUTURE.md#scraper-enhancements) for detailed specifications of pending features.

---

## Phase 9: Advanced Discovery Features

**Goal**: Implement advanced discovery methods to find scholarships from non-traditional sources

This phase extends the basic AI discovery with more sophisticated techniques for finding scholarships from social media, news sources, and through intelligent website analysis.

- [ ] ### 9.1: Enhanced Google Search API Integration

Create `scholarship-finder/src/discovery/google_search.py`:

```python
"""
Enhanced Google Search API Integration
Advanced search queries to find scholarship pages
"""
import os
from typing import List, Dict
from googleapiclient.discovery import build
import time

class GoogleScholarshipSearch:
    def __init__(self):
        self.api_key = os.getenv('GOOGLE_API_KEY')
        self.cx = os.getenv('GOOGLE_CUSTOM_SEARCH_CX')
        self.service = build('customsearch', 'v1', developerKey=self.api_key)

    def generate_advanced_queries(self, location: str = None, field: str = None) -> List[str]:
        """
        Generate advanced search queries to find scholarships

        These queries are designed to:
        - Exclude aggregator sites (CareerOneStop, CollegeScholarships.org)
        - Target original sources (organizations, foundations)
        - Find local/regional opportunities
        """
        base_queries = [
            # Direct scholarship pages, excluding aggregators
            '"scholarship application" site:*.com -site:collegescholarships.org -site:collegescholarships.org -site:cappex.com',
            '"scholarship application" site:*.org -site:collegescholarships.org-site:collegescholarships.org',

            # Annual scholarships from professional organizations
            '"annual scholarship" "law firm" OR "medical practice" OR "accounting firm"',
            '"annual scholarship" "engineering firm" OR "architecture firm"',

            # URL-based searches (likely to be dedicated scholarship pages)
            'inurl:scholarship site:*.org',
            'inurl:scholarships site:*.edu',
            'inurl:giving site:*.com',
            'inurl:foundation site:*.org',

            # Community and local businesses
            '"student scholarship" "local business"',
            '"community scholarship" "foundation"',

            # Professional associations
            '"student member" scholarship site:*.org',
            '"professional association" scholarship',

            # Corporate foundations
            '"corporate foundation" scholarship',
            'site:foundation.*.com scholarship',
        ]

        # Add location-specific queries
        if location:
            location_queries = [
                f'"scholarship" "{location}" "high school" OR "college"',
                f'"student scholarship" "{location}" -site:collegescholarships.org',
                f'site:*.{location.lower()}.us scholarship',
            ]
            base_queries.extend(location_queries)

        # Add field-specific queries
        if field:
            field_queries = [
                f'"{field}" scholarship site:*.org',
                f'"{field}" "student award" -site:collegescholarships.org',
            ]
            base_queries.extend(field_queries)

        return base_queries

    def search_with_query(self, query: str, num_results: int = 10) -> List[Dict]:
        """
        Execute a single search query and return results
        """
        try:
            result = self.service.cse().list(
                q=query,
                cx=self.cx,
                num=num_results
            ).execute()

            items = result.get('items', [])

            scholarships = []
            for item in items:
                scholarships.append({
                    'title': item.get('title'),
                    'url': item.get('link'),
                    'snippet': item.get('snippet'),
                    'source_query': query
                })

            return scholarships

        except Exception as e:
            print(f"Search error for query '{query}': {e}")
            return []

    def discover_scholarships(self, location: str = None, field: str = None,
                            max_results: int = 50) -> List[Dict]:
        """
        Main discovery function using advanced Google searches

        Returns list of potential scholarship URLs to be verified by AI
        """
        queries = self.generate_advanced_queries(location, field)
        all_results = []
        seen_urls = set()

        for query in queries:
            if len(all_results) >= max_results:
                break

            print(f"Searching: {query[:80]}...")
            results = self.search_with_query(query)

            # Deduplicate by URL
            for result in results:
                url = result['url']
                if url not in seen_urls:
                    seen_urls.add(url)
                    all_results.append(result)

            # Rate limiting (Google Custom Search has strict limits)
            time.sleep(1)

        print(f"Found {len(all_results)} unique URLs")
        return all_results[:max_results]
```

- [ ] ### 9.2: Social Media & News Scraping

Create `scholarship-finder/src/discovery/news_social.py`:

```python
"""
Social Media & News Source Discovery
Find scholarship announcements from LinkedIn, Twitter, press releases, and local news
"""
import requests
from bs4 import BeautifulSoup
from typing import List, Dict
import json
from datetime import datetime, timedelta

class NewsAndSocialDiscovery:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (compatible; ScholarshipBot/1.0)'
        }

    def search_press_releases(self, keywords: List[str] = None) -> List[Dict]:
        """
        Search press release aggregators for scholarship announcements

        Sources:
        - PR Newswire
        - Business Wire
        - PRWeb
        """
        if keywords is None:
            keywords = ['scholarship', 'student award', 'education grant']

        results = []

        # PR Newswire search
        for keyword in keywords:
            try:
                url = f"https://www.prnewswire.com/news-releases/education-latest-news/education-list/?keyword={keyword}"
                response = requests.get(url, headers=self.headers, timeout=10)
                soup = BeautifulSoup(response.text, 'html.parser')

                # Parse press release listings
                articles = soup.find_all('div', class_='card')[:10]  # Limit to 10 per keyword

                for article in articles:
                    title_elem = article.find('h3')
                    link_elem = article.find('a')
                    date_elem = article.find('time')

                    if title_elem and link_elem:
                        results.append({
                            'title': title_elem.get_text(strip=True),
                            'url': 'https://www.prnewswire.com' + link_elem.get('href'),
                            'date': date_elem.get('datetime') if date_elem else None,
                            'source': 'PR Newswire',
                            'type': 'press_release'
                        })

            except Exception as e:
                print(f"Error searching PR Newswire for '{keyword}': {e}")

        return results

    def search_local_news(self, location: str, keywords: List[str] = None) -> List[Dict]:
        """
        Search local news sites for scholarship announcements

        Strategy:
        - Use Google News search with location filter
        - Parse results for scholarship announcements
        """
        if keywords is None:
            keywords = ['scholarship announced', 'scholarship program', 'student award']

        results = []

        for keyword in keywords:
            try:
                # Google News search URL
                query = f"{keyword} {location}"
                url = f"https://news.google.com/search?q={query}&hl=en-US&gl=US&ceid=US:en"

                response = requests.get(url, headers=self.headers, timeout=10)
                soup = BeautifulSoup(response.text, 'html.parser')

                # Parse news articles (structure may vary)
                articles = soup.find_all('article')[:5]

                for article in articles:
                    title_elem = article.find('h3') or article.find('h4')
                    link_elem = article.find('a')

                    if title_elem and link_elem:
                        results.append({
                            'title': title_elem.get_text(strip=True),
                            'url': 'https://news.google.com' + link_elem.get('href'),
                            'source': 'Google News',
                            'location': location,
                            'type': 'news_article'
                        })

            except Exception as e:
                print(f"Error searching local news for '{keyword}': {e}")

        return results

    def search_linkedin_posts(self, keyword: str = "scholarship") -> List[Dict]:
        """
        Search LinkedIn for scholarship announcements

        NOTE: LinkedIn has strict API access. This is a placeholder for:
        - LinkedIn API integration (requires company/developer account)
        - Or web scraping (requires authentication, may violate ToS)

        Alternative approach:
        - Use Google to search LinkedIn: site:linkedin.com scholarship announcement
        """
        # Placeholder - would require LinkedIn API credentials
        print("⚠️  LinkedIn search requires API access or authentication")
        print("   Alternative: Use Google search with site:linkedin.com filter")

        return []

    def discover_from_all_sources(self, location: str = None) -> List[Dict]:
        """
        Aggregate scholarship leads from all news and social sources
        """
        all_results = []

        # Press releases
        print("🔍 Searching press releases...")
        press_results = self.search_press_releases()
        all_results.extend(press_results)

        # Local news (if location provided)
        if location:
            print(f"🔍 Searching local news in {location}...")
            news_results = self.search_local_news(location)
            all_results.extend(news_results)

        # LinkedIn (placeholder)
        # linkedin_results = self.search_linkedin_posts()
        # all_results.extend(linkedin_results)

        print(f"   Found {len(all_results)} potential leads from news/social")
        return all_results
```

- [ ] ### 9.3: Website Structure Analysis

Create `scholarship-finder/src/discovery/website_analyzer.py`:

```python
"""
Website Structure Analysis
Use AI to understand website structure and identify likely scholarship pages
"""
from typing import List, Dict, Optional
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import openai
import os

class WebsiteAnalyzer:
    def __init__(self):
        self.client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (compatible; ScholarshipBot/1.0)'
        }

    def analyze_site_structure(self, domain: str) -> Dict:
        """
        Analyze website structure to identify scholarship-related pages

        Strategy:
        1. Fetch homepage and sitemap
        2. Identify navigation structure
        3. Use AI to predict likely scholarship URLs
        4. Generate targeted scraping strategy
        """
        try:
            # Fetch homepage
            homepage_url = f"https://{domain}"
            response = requests.get(homepage_url, headers=self.headers, timeout=10)
            soup = BeautifulSoup(response.text, 'html.parser')

            # Extract navigation links
            nav_links = self._extract_navigation_links(soup, homepage_url)

            # Use AI to identify scholarship-related paths
            scholarship_paths = self._ai_identify_scholarship_paths(domain, nav_links)

            return {
                'domain': domain,
                'homepage_url': homepage_url,
                'total_nav_links': len(nav_links),
                'potential_scholarship_urls': scholarship_paths,
                'analysis_strategy': self._generate_scraping_strategy(scholarship_paths)
            }

        except Exception as e:
            print(f"Error analyzing {domain}: {e}")
            return None

    def _extract_navigation_links(self, soup: BeautifulSoup, base_url: str) -> List[Dict]:
        """
        Extract all navigation links from the page
        """
        links = []

        # Find all links in nav, header, footer
        for tag in soup.find_all(['nav', 'header', 'footer']):
            for link in tag.find_all('a', href=True):
                href = link.get('href')
                text = link.get_text(strip=True)

                # Convert to absolute URL
                absolute_url = urljoin(base_url, href)

                # Only include same-domain links
                if urlparse(absolute_url).netloc == urlparse(base_url).netloc:
                    links.append({
                        'url': absolute_url,
                        'text': text,
                        'path': urlparse(absolute_url).path
                    })

        return links

    def _ai_identify_scholarship_paths(self, domain: str, nav_links: List[Dict]) -> List[str]:
        """
        Use AI to identify which navigation paths are likely to contain scholarship info
        """
        # Create summary of navigation structure
        nav_summary = "\n".join([
            f"- {link['path']} ('{link['text']}')"
            for link in nav_links[:50]  # Limit to 50 to stay within token limits
        ])

        prompt = f"""
Analyze this website navigation structure from {domain} and identify URLs that are most likely to contain scholarship or financial aid information.

Navigation paths:
{nav_summary}

Common scholarship page patterns:
- /scholarships, /scholarship
- /giving, /foundation
- /students/financial-aid
- /community/scholarships
- /about/giving

Return a JSON array of the most promising paths (up to 5), ordered by likelihood.
Format: ["path1", "path2", ...]

If none seem scholarship-related, return an empty array.
"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a web analysis assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=200
            )

            result = response.choices[0].message.content.strip()

            # Parse JSON response
            import json
            paths = json.loads(result)

            # Convert paths to full URLs
            scholarship_urls = [
                f"https://{domain}{path}" for path in paths
            ]

            return scholarship_urls

        except Exception as e:
            print(f"AI analysis error: {e}")

            # Fallback: Use pattern matching
            scholarship_keywords = [
                'scholarship', 'scholarships', 'giving', 'foundation',
                'financial-aid', 'student-support', 'grants'
            ]

            fallback_urls = []
            for link in nav_links:
                path_lower = link['path'].lower()
                if any(keyword in path_lower for keyword in scholarship_keywords):
                    fallback_urls.append(link['url'])

            return fallback_urls[:5]

    def _generate_scraping_strategy(self, scholarship_urls: List[str]) -> Dict:
        """
        Generate a targeted scraping strategy based on identified URLs
        """
        if not scholarship_urls:
            return {
                'strategy': 'no_scholarship_pages',
                'recommendation': 'Skip this domain or try general page search'
            }

        return {
            'strategy': 'targeted_scraping',
            'urls_to_scrape': scholarship_urls,
            'priority': 'high' if len(scholarship_urls) > 0 else 'low',
            'recommendation': f'Scrape {len(scholarship_urls)} identified scholarship pages'
        }

    def analyze_organizations(self, organization_list: List[str]) -> List[Dict]:
        """
        Analyze multiple organizations to find scholarship opportunities

        Example organizations:
        - Local law firms
        - Medical practices
        - Engineering companies
        - Community foundations
        """
        results = []

        for org in organization_list:
            print(f"Analyzing {org}...")
            analysis = self.analyze_site_structure(org)
            if analysis:
                results.append(analysis)

        return results
```

- [ ] ### 9.4: Integration & Orchestration

Create `scholarship-finder/src/discovery/advanced_discovery.py`:

```python
"""
Advanced Discovery Orchestrator
Combines all advanced discovery methods
"""
from .google_search import GoogleScholarshipSearch
from .news_social import NewsAndSocialDiscovery
from .website_analyzer import WebsiteAnalyzer
from ..ai_discovery.discovery_engine import AIDiscoveryEngine
from typing import List, Dict

class AdvancedDiscoveryOrchestrator:
    def __init__(self, db_connection):
        self.db = db_connection
        self.google_search = GoogleScholarshipSearch()
        self.news_social = NewsAndSocialDiscovery()
        self.website_analyzer = WebsiteAnalyzer()
        self.ai_discovery = AIDiscoveryEngine(db_connection)

    def discover_comprehensive(self,
                              location: str = None,
                              field: str = None,
                              max_total: int = 100) -> List[Dict]:
        """
        Comprehensive discovery using all available methods
        """
        all_leads = []

        # 1. Enhanced Google Search
        print("\n📍 Phase 1: Advanced Google Search")
        google_results = self.google_search.discover_scholarships(
            location=location,
            field=field,
            max_results=50
        )
        all_leads.extend(google_results)

        # 2. News & Social Media
        print("\n📰 Phase 2: News & Social Media")
        news_results = self.news_social.discover_from_all_sources(location=location)
        all_leads.extend(news_results)

        # 3. Website Structure Analysis (for promising domains)
        print("\n🔬 Phase 3: Website Structure Analysis")
        # Extract unique domains from leads
        domains = set()
        for lead in all_leads:
            url = lead.get('url', '')
            if url:
                from urllib.parse import urlparse
                domain = urlparse(url).netloc
                domains.add(domain)

        # Analyze top domains
        for domain in list(domains)[:10]:  # Limit to top 10
            analysis = self.website_analyzer.analyze_site_structure(domain)
            if analysis and analysis.get('potential_scholarship_urls'):
                for url in analysis['potential_scholarship_urls']:
                    all_leads.append({
                        'url': url,
                        'title': f"Scholarship page on {domain}",
                        'source': 'website_analysis',
                        'domain': domain
                    })

        # 4. AI Verification & Extraction
        print("\n🤖 Phase 4: AI Verification & Data Extraction")
        verified_scholarships = []

        for i, lead in enumerate(all_leads[:max_total], 1):
            print(f"   Verifying {i}/{min(len(all_leads), max_total)}: {lead.get('title', 'Unknown')[:50]}")

            url = lead.get('url')
            if not url:
                continue

            try:
                # Fetch page content
                import requests
                response = requests.get(url, timeout=10, headers={
                    'User-Agent': 'Mozilla/5.0 (compatible; ScholarshipBot/1.0)'
                })
                html = response.text

                # Verify it's a scholarship page
                if self.ai_discovery.verify_scholarship_page(url, html):
                    # Extract structured data
                    scholarship_data = self.ai_discovery.extract_scholarship_data(url, html)
                    if scholarship_data:
                        scholarship_data['discovery_method'] = lead.get('source', 'unknown')
                        verified_scholarships.append(scholarship_data)

            except Exception as e:
                print(f"      Error processing {url}: {e}")
                continue

        print(f"\n✅ Discovered {len(verified_scholarships)} verified scholarships")
        return verified_scholarships
```

- [ ] ### 9.5: Usage & Configuration

Add to `scholarship-finder/finder_main.py`:

```python
# Add advanced discovery mode
from src.discovery.advanced_discovery import AdvancedDiscoveryOrchestrator

def run_advanced_discovery(location=None, field=None):
    """Run advanced discovery with all methods"""
    db = DatabaseConnection()
    db.connect()

    orchestrator = AdvancedDiscoveryOrchestrator(db)

    scholarships = orchestrator.discover_comprehensive(
        location=location,
        field=field,
        max_total=100
    )

    # Save to database using deduplication engine
    dedup = DeduplicationEngine(db)
    saved_count = 0

    for scholarship in scholarships:
        is_duplicate, existing_id = dedup.check_duplicate(scholarship)
        if not is_duplicate:
            # Insert new scholarship
            db.insert_scholarship(scholarship)
            saved_count += 1

    print(f"\n💾 Saved {saved_count} new scholarships to database")
    db.close()
```

### Cost Estimates for Advanced Discovery

**Google Custom Search API:**
- 100 queries/day free
- $5 per 1,000 queries after that
- Estimated: 50-100 queries per discovery run
- Monthly cost (daily runs): ~$0 (within free tier) to $15/month

**OpenAI API:**
- GPT-3.5-turbo: ~$0.001 per verification
- GPT-4o-mini: ~$0.01 per extraction
- Estimated: 100 verifications + 50 extractions per run
- Monthly cost (daily runs): ~$15-30/month

**Total estimated cost for advanced discovery: $15-45/month**

### Ethical & Legal Considerations

**Important Notes:**
1. **Robots.txt Compliance**: Always check robots.txt before scraping
2. **Rate Limiting**: Implement delays between requests (1-2 seconds minimum)
3. **Terms of Service**: Review ToS for each source
4. **LinkedIn/Social Media**: API access required; web scraping may violate ToS
5. **Attribution**: Always attribute scholarship sources correctly
6. **Privacy**: Don't collect personal information from pages

### Implementation Checklist

- [ ] Set up Google Custom Search API credentials
- [ ] Implement enhanced Google search queries
- [ ] Add press release monitoring
- [ ] Implement local news search
- [ ] Create website structure analyzer
- [ ] Integrate AI verification for all sources
- [ ] Set up orchestrator to coordinate all methods
- [ ] Add configuration for location/field targeting
- [ ] Implement rate limiting and error handling
- [ ] Test with sample organizations
- [ ] Monitor API costs and adjust accordingly

---

## Next Steps

1. Implement database migrations (Phase 1)
2. Set up Python scholarship finder (Phase 2)
3. Test deduplication engine (Phase 3)
4. Test AI discovery with one category (Phase 4)
5. Set up basic scheduler (Phase 6)
6. Integrate existing scraper code (Phase 8)
7. **Implement advanced discovery features (Phase 9)** ← NEW

After this is working, move to **SCHOLARSHIP_SEARCH_IMPLEMENTATION.md** for the user-facing features.

---

## References

- Existing scraper location: `/Users/teial/Tutorials/scholarship-tracker/scraper/`
- Main implementation: `IMPLEMENTATION_PLAN.md`
- Search & discovery: `SCHOLARSHIP_SEARCH_IMPLEMENTATION.md`
- Google Custom Search API: https://developers.google.com/custom-search
- OpenAI API: https://platform.openai.com/docs
