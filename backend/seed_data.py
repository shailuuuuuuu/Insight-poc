"""
Comprehensive seed data generator for the Insight POC.

Creates 10,000+ students with full test data coverage across:
- Multiple countries (USA, Australia), states, districts, schools
- All grades (PreK through 8)
- All 8 CUBED-3 subtests with grade-appropriate administration
- All time periods (BOY, MOY, EOY) and both assessment types
- All risk levels (benchmark, moderate, high)
- Groups, licenses, My Students assignments
- IntelliScore transcripts and analysis on NLM sessions
- Active and inactive students
- Admin and examiner users
- Multiple academic years
"""

import sys
import os
import random
import datetime
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from database import engine, SessionLocal, Base
from models import (
    Organization, User, Student, Group, License,
    TestSession, Score, user_students, group_students,
)
from auth import hash_password
from services.scoring import classify_risk

random.seed(42)

# ---------------------------------------------------------------------------
# Reference data
# ---------------------------------------------------------------------------

GEOGRAPHY = {
    "US": {
        "California": {
            "Los Angeles USD": ["Lincoln Elementary", "Roosevelt Middle", "Jefferson Academy", "Washington STEM"],
            "San Francisco USD": ["Sunset Elementary", "Marina Middle", "Bayview Academy"],
            "Sacramento City USD": ["Capitol Elementary", "River Park Middle"],
        },
        "Texas": {
            "Houston ISD": ["Memorial Elementary", "Westside Middle", "Galleria Academy", "Energy Corridor School"],
            "Austin ISD": ["Zilker Elementary", "Barton Hills Middle", "Ladybird Academy"],
            "Dallas ISD": ["Preston Hollow Elementary", "Lakewood Middle"],
        },
        "New York": {
            "NYC DOE District 2": ["PS 234 Independence", "PS 41 Greenwich Village", "MS 297 Academy"],
            "NYC DOE District 15": ["PS 321 William Penn", "MS 51 William Alexander"],
            "Buffalo Public Schools": ["Waterfront Elementary", "Elmwood Middle"],
        },
        "Florida": {
            "Miami-Dade County PS": ["Coral Gables Elementary", "Palmetto Middle", "Biscayne Bay Academy"],
            "Broward County PS": ["Plantation Elementary", "Sunrise Middle"],
        },
        "Illinois": {
            "Chicago Public Schools": ["Lincoln Park Elementary", "Lakeview Middle", "Wicker Park Academy"],
            "Evanston/Skokie District 65": ["Orrington Elementary", "Haven Middle"],
        },
    },
    "AU": {
        "New South Wales": {
            "Sydney Metro": ["Bondi Beach Public School", "Manly Vale Public School", "Parramatta East PS"],
            "Hunter Valley": ["Newcastle East Public School", "Maitland Public School"],
        },
        "Victoria": {
            "Melbourne Metro": ["Brighton Beach Primary", "Fitzroy Primary", "South Yarra PS"],
            "Geelong Region": ["Geelong West Primary", "Belmont Primary"],
        },
        "Queensland": {
            "Brisbane Metro": ["New Farm State School", "Paddington State School", "Ascot State School"],
            "Gold Coast": ["Burleigh Heads State School", "Southport State School"],
        },
    },
}

GRADES = ["PreK", "K", "1", "2", "3", "4", "5", "6", "7", "8"]

SUBTESTS = [
    {"id": "NLM_LISTENING", "grades": ["PreK", "K", "1", "2", "3"],
     "targets": ["NLM_RETELL", "NLM_QUESTIONS"],
     "benchmark_keys": {"NLM_RETELL": "NLM_RETELL_LISTENING", "NLM_QUESTIONS": "NLM_QUESTIONS_LISTENING"}},
    {"id": "NLM_READING", "grades": ["1", "2", "3", "4", "5", "6", "7", "8"],
     "targets": ["NLM_RETELL", "NLM_QUESTIONS", "DECODING_FLUENCY"],
     "benchmark_keys": {"NLM_RETELL": "NLM_RETELL_READING", "NLM_QUESTIONS": "NLM_QUESTIONS_READING",
                         "DECODING_FLUENCY": "DECODING_FLUENCY"}},
    {"id": "DDM_PA", "grades": ["PreK", "K", "1", "2"],
     "targets": ["PHONEME_SEGMENTATION", "PHONEME_BLENDING", "FIRST_SOUNDS", "CONTINUOUS_PHONEME_BLENDING"],
     "benchmark_keys": {}},
    {"id": "DDM_PM", "grades": ["1", "2"],
     "targets": ["PHONEME_DELETION", "PHONEME_ADDITION", "PHONEME_SUBSTITUTION"],
     "benchmark_keys": {}},
    {"id": "DDM_OM", "grades": ["PreK", "K", "1", "2"],
     "targets": ["IRREGULAR_WORDS", "LETTER_SOUNDS", "LETTER_NAMES"],
     "benchmark_keys": {}},
    {"id": "DDM_DI", "grades": ["K", "1", "2", "3", "4"],
     "targets": ["CLOSED_SYLLABLES", "VCE", "BASIC_AFFIXES", "VOWEL_TEAMS", "VOWEL_R_CONTROLLED",
                  "ADVANCED_AFFIXES", "COMPLEX_VOWELS", "ADVANCED_WORD_FORMS"],
     "benchmark_keys": {}},
]

SUB_TARGETS = {
    "NLM_RETELL": ["EC1", "EC2", "SC", "VC", "NDC"],
    "NLM_QUESTIONS": ["FACTUAL", "INFERENTIAL_VOCABULARY", "INFERENTIAL_REASONING", "EXPOSITORY"],
}

FIRST_NAMES = [
    "Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason", "Isabella", "Logan",
    "Mia", "Lucas", "Amelia", "Aiden", "Harper", "Elijah", "Evelyn", "James", "Abigail", "Benjamin",
    "Charlotte", "Alexander", "Emily", "Daniel", "Elizabeth", "Henry", "Sofia", "Sebastian", "Avery", "Jack",
    "Ella", "Owen", "Scarlett", "Samuel", "Grace", "Ryan", "Chloe", "Nathan", "Victoria", "Caleb",
    "Riley", "Dylan", "Aria", "Luke", "Lily", "Gabriel", "Aurora", "Anthony", "Zoey", "Isaac",
    "Penelope", "Jayden", "Layla", "Leo", "Nora", "Lincoln", "Camila", "Jaxon", "Hannah", "Asher",
    "Addison", "Christopher", "Eleanor", "Andrew", "Stella", "Theodore", "Bella", "Joshua", "Lucy", "Mateo",
    "Savannah", "Adrian", "Anna", "Thomas", "Caroline", "Charles", "Genesis", "Hudson", "Maya", "Robert",
    "Willow", "Jonathan", "Paisley", "David", "Madelyn", "Hunter", "Ellie", "Cameron", "Hailey", "Ezra",
    "Aaliyah", "Kai", "Kinsley", "Levi", "Naomi", "Landon", "Ariana", "Xavier", "Allison", "Connor",
    "Sakura", "Yuki", "Haruto", "Mei", "Riku", "Aiko", "Jin", "Yuna", "Kenji", "Hana",
    "Priya", "Arjun", "Ananya", "Ravi", "Devi", "Sanjay", "Lakshmi", "Kiran", "Nisha", "Raj",
    "Chen", "Wei", "Xia", "Ming", "Ling", "Jun", "Hua", "Fang", "Ping", "Bao",
    "Mateo", "Valentina", "Santiago", "Camila", "Diego", "Luna", "Emiliano", "Isabel", "Andres", "Lucia",
]
LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
    "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
    "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
    "Chen", "Kim", "Patel", "Singh", "Wang", "Li", "Zhang", "Liu", "Tanaka", "Sato",
    "Yamamoto", "Nakamura", "Kumar", "Sharma", "Gupta", "Wong", "Chan", "Park", "Choi", "Ramos",
    "O'Brien", "Murphy", "Sullivan", "Kelly", "Murray", "Hughes", "Barnes", "Watson", "Brooks", "Bell",
    "O'Connor", "Fitzgerald", "MacDonald", "Fraser", "Campbell", "Stewart", "Robertson", "Thomson", "Hamilton", "Graham",
    "Silva", "Santos", "Oliveira", "Costa", "Ferreira", "Almeida", "Sousa", "Pereira", "Carvalho", "Ribeiro",
]

SAMPLE_TRANSCRIPTS = [
    "There was a girl named Maya who lost her dog. She was very worried because he ran away. She looked everywhere around the neighborhood. She asked her friends to help search. Finally they found him in the park playing with other dogs. Maya was so happy and relieved that she hugged him tightly.",
    "A boy named Sam went to school and there was a big problem because the teacher was missing. All the kids were confused and scared. Sam tried to find out what happened so he went to the office. The principal told them the teacher was sick. They got a substitute who was really nice and taught them about planets.",
    "Once upon a time a cat fell into a well. The cat was stuck and meowed loudly. A bird heard the cat and tried to help. The bird flew to get a rope because it knew where one was. When the bird came back it dropped the rope down and the cat climbed out. They became best friends after that.",
    "The story is about two friends who wanted to build a treehouse. They collected wood from the forest but then it started raining. They were sad because they couldnt work. After the rain stopped they went back and finally built the treehouse. It was small but they were proud because they made it themselves.",
    "There was a problem at the farm when the sheep escaped. The farmer tried to catch them but they ran too fast. His daughter who was clever thought of using food to lure them back. She put hay near the gate so that the sheep would come. The plan worked and all the sheep returned. The farmer was grateful and learned to fix the broken fence.",
    "A little fish wanted to see the ocean. He swam and swam until he got lost. He was scared because everything looked different. He met a friendly turtle who helped him find his way home. The turtle was kind and showed him landmarks to remember. Finally the fish made it back and told everyone about his adventure.",
    "The students were working on a science project when their experiment went wrong. The volcano model erupted too much and made a mess. They were upset but the teacher said it was okay. They decided to try again with less baking soda. The second time it worked perfectly and they won the science fair because their project was creative and well-explained.",
    "There once lived a brave knight who had to save the kingdom. A dragon was burning the crops and everyone was hungry. The knight thought of a clever plan because fighting wasnt the answer. He brought music to the dragon since dragons love melodies. The dragon calmed down and stopped burning things. The kingdom was saved and the knight became famous for his wisdom.",
]

ACADEMIC_YEARS = ["2024-2025", "2025-2026"]
TIMES_OF_YEAR = ["BOY", "MOY", "EOY"]
GENDERS = ["M", "F", "Other"]

with open(Path(__file__).parent / "data" / "benchmarks.json") as f:
    BENCHMARKS = json.load(f)


def generate_score_for_risk(benchmark_key: str, grade: str, toy: str, desired_risk: str) -> float | None:
    """Generate a raw score that falls into the desired risk band."""
    subtest_data = BENCHMARKS.get(benchmark_key)
    if not subtest_data:
        return round(random.uniform(0, 20), 1)
    grade_data = subtest_data.get(grade)
    if not grade_data:
        return round(random.uniform(0, 20), 1)
    toy_data = grade_data.get(toy)
    if not toy_data:
        return round(random.uniform(0, 20), 1)

    benchmark_val = toy_data.get("benchmark", 20)
    moderate_val = toy_data.get("moderate", 10)

    if desired_risk == "benchmark":
        return round(random.uniform(benchmark_val, benchmark_val * 1.3 + 5), 1)
    elif desired_risk == "moderate":
        return round(random.uniform(moderate_val, benchmark_val - 0.1), 1)
    else:
        low = max(0, moderate_val * 0.3)
        return round(random.uniform(low, moderate_val - 0.1), 1)


def main():
    print("=" * 70)
    print("  Insight POC — Comprehensive Seed Data Generator")
    print("=" * 70)

    # Wipe existing DB and recreate
    db_path = Path(__file__).parent / "insight.db"
    if db_path.exists():
        db_path.unlink()
        print("  Deleted existing database.")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        _seed(db)
    finally:
        db.close()


def _seed(db):
    # ------------------------------------------------------------------
    # 1. Organizations (one per district)
    # ------------------------------------------------------------------
    print("\n[1/8] Creating organizations...")
    orgs = []
    org_map = {}
    for country_code, states in GEOGRAPHY.items():
        for state, districts in states.items():
            for district, schools in districts.items():
                org = Organization(
                    name=district,
                    org_type="district",
                    district=district,
                    state=state,
                    country=country_code,
                    intelliscore_enabled=True,
                )
                db.add(org)
                db.flush()
                orgs.append(org)
                org_map[(country_code, state, district)] = org
    db.commit()
    print(f"  Created {len(orgs)} organizations across {sum(len(s) for s in GEOGRAPHY.values())} states / 2 countries.")

    # ------------------------------------------------------------------
    # 2. Users (2 admins + 3-5 examiners per org)
    # ------------------------------------------------------------------
    print("\n[2/8] Creating users...")
    all_users = []
    user_counter = 0
    password_hash = hash_password("password123")

    for org in orgs:
        for i in range(2):
            user_counter += 1
            u = User(
                email=f"admin{user_counter}@insight-seed.edu",
                hashed_password=password_hash,
                first_name=random.choice(FIRST_NAMES),
                last_name=random.choice(LAST_NAMES),
                role="admin",
                is_active=True,
                organization_id=org.id,
            )
            db.add(u)
            all_users.append(u)

        n_examiners = random.randint(3, 5)
        for i in range(n_examiners):
            user_counter += 1
            u = User(
                email=f"examiner{user_counter}@insight-seed.edu",
                hashed_password=password_hash,
                first_name=random.choice(FIRST_NAMES),
                last_name=random.choice(LAST_NAMES),
                role="examiner",
                is_active=(random.random() > 0.05),
                organization_id=org.id,
            )
            db.add(u)
            all_users.append(u)
    db.commit()
    print(f"  Created {len(all_users)} users ({sum(1 for u in all_users if u.role == 'admin')} admins, {sum(1 for u in all_users if u.role == 'examiner')} examiners).")

    # Also create a known demo user for easy login
    demo_user = User(
        email="demo@insight.edu",
        hashed_password=hash_password("demo123"),
        first_name="Demo",
        last_name="User",
        role="admin",
        is_active=True,
        organization_id=orgs[0].id,
    )
    db.add(demo_user)
    db.commit()
    all_users.append(demo_user)
    print(f"  Demo login: demo@insight.edu / demo123")

    # ------------------------------------------------------------------
    # 3. Licenses (per org per academic year)
    # ------------------------------------------------------------------
    print("\n[3/8] Creating licenses...")
    license_count = 0
    for org in orgs:
        for ay in ACADEMIC_YEARS:
            lic = License(
                organization_id=org.id,
                total=random.randint(200, 1000),
                used=0,
                academic_year=ay,
            )
            db.add(lic)
            license_count += 1
    db.commit()
    print(f"  Created {license_count} license records.")

    # ------------------------------------------------------------------
    # 4. Students (10,000+)
    # ------------------------------------------------------------------
    print("\n[4/8] Creating 10,000+ students...")
    all_students = []
    student_idx = 0
    students_per_school_target = 10000

    # Build flat list of (country, state, district, school)
    flat_schools = []
    for country_code, states in GEOGRAPHY.items():
        for state, districts in states.items():
            for district, schools in districts.items():
                for school in schools:
                    flat_schools.append((country_code, state, district, school))

    per_school = students_per_school_target // len(flat_schools) + 1

    for country_code, state, district, school in flat_schools:
        org = org_map[(country_code, state, district)]
        n_students = per_school + random.randint(-20, 20)
        n_students = max(50, n_students)

        for _ in range(n_students):
            student_idx += 1
            grade = random.choice(GRADES)
            dob_year = 2026 - (GRADES.index(grade) + 4)
            dob = f"{dob_year}-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
            is_inactive = random.random() < 0.03

            s = Student(
                first_name=random.choice(FIRST_NAMES),
                last_name=random.choice(LAST_NAMES),
                grade=grade,
                student_id_external=f"STU-{country_code}-{student_idx:06d}",
                school=school,
                district=district,
                gender=random.choice(GENDERS),
                date_of_birth=dob,
                status="inactive" if is_inactive else "active",
                organization_id=org.id,
            )
            db.add(s)
            all_students.append(s)

        if student_idx % 2000 == 0:
            db.flush()
            print(f"    ... {student_idx} students created")

    db.commit()
    print(f"  Created {len(all_students)} students across {len(flat_schools)} schools.")

    # ------------------------------------------------------------------
    # 5. My Students assignments + Groups
    # ------------------------------------------------------------------
    print("\n[5/8] Creating My Students assignments and groups...")
    org_students = {}
    for s in all_students:
        org_students.setdefault(s.organization_id, []).append(s)

    org_users = {}
    for u in all_users:
        if u.role == "examiner" and u.is_active:
            org_users.setdefault(u.organization_id, []).append(u)

    assignment_count = 0
    group_count = 0
    group_membership_count = 0

    for org in orgs:
        students = org_students.get(org.id, [])
        examiners = org_users.get(org.id, [])
        if not examiners or not students:
            continue

        # Distribute students among examiners
        random.shuffle(students)
        chunk_size = max(1, len(students) // len(examiners))
        for i, examiner in enumerate(examiners):
            start = i * chunk_size
            end = start + chunk_size if i < len(examiners) - 1 else len(students)
            my_students = students[start:end]
            for s in my_students:
                db.execute(user_students.insert().values(user_id=examiner.id, student_id=s.id))
                assignment_count += 1

            # Create groups per examiner
            group_names = [
                (f"Grade {g} — {examiner.first_name}", f"All grade {g} students for {examiner.first_name}")
                for g in set(s.grade for s in my_students)
            ]
            if len(my_students) > 10:
                group_names.append((f"Intervention Group — {examiner.first_name}", "Students requiring intervention"))
                group_names.append((f"Progress Monitoring — {examiner.first_name}", "Students in progress monitoring"))

            for gname, gdesc in group_names[:5]:
                grp = Group(name=gname, description=gdesc, owner_id=examiner.id)
                db.add(grp)
                db.flush()
                group_count += 1

                grade_match = None
                for token in gname.split():
                    if token in GRADES:
                        grade_match = token
                        break

                if grade_match:
                    members = [s for s in my_students if s.grade == grade_match]
                else:
                    members = random.sample(my_students, min(15, len(my_students)))

                for s in members:
                    db.execute(group_students.insert().values(group_id=grp.id, student_id=s.id))
                    group_membership_count += 1

        db.flush()

    # Assign some students to the demo user
    demo_org_students = org_students.get(demo_user.organization_id, [])
    for s in demo_org_students[:200]:
        db.execute(user_students.insert().values(user_id=demo_user.id, student_id=s.id))
        assignment_count += 1

    demo_groups = [
        ("Kindergarten Benchmark", "K benchmark students"),
        ("Grade 1 Intervention", "Grade 1 students needing intervention"),
        ("Grade 2 Progress Monitor", "Grade 2 PM group"),
        ("High Risk NLM", "Students at high risk on NLM"),
        ("DDM Focus Group", "Students needing DDM support"),
    ]
    for gname, gdesc in demo_groups:
        grp = Group(name=gname, description=gdesc, owner_id=demo_user.id)
        db.add(grp)
        db.flush()
        group_count += 1
        members = random.sample(demo_org_students[:200], min(25, len(demo_org_students)))
        for s in members:
            db.execute(group_students.insert().values(group_id=grp.id, student_id=s.id))
            group_membership_count += 1

    db.commit()
    print(f"  Created {assignment_count} My Students assignments.")
    print(f"  Created {group_count} groups with {group_membership_count} memberships.")

    # ------------------------------------------------------------------
    # 6. Test sessions & scores (cover every subtest/grade/TOY combo)
    # ------------------------------------------------------------------
    print("\n[6/8] Creating test sessions and scores...")
    session_count = 0
    score_count = 0
    intelliscore_count = 0

    risk_distribution = ["benchmark"] * 50 + ["moderate"] * 30 + ["high"] * 20

    active_students = [s for s in all_students if s.status == "active"]

    # Phase A: Ensure every subtest × grade × TOY × assessment_type combo is covered
    print("  Phase A: Covering every subtest/grade/TOY combination...")
    for subtest_info in SUBTESTS:
        for grade in subtest_info["grades"]:
            for toy in TIMES_OF_YEAR:
                for atype in ["benchmark", "progress_monitoring"]:
                    candidates = [s for s in active_students if s.grade == grade]
                    if not candidates:
                        continue
                    student = random.choice(candidates)
                    examiner = _get_examiner(student, org_users)
                    if not examiner:
                        continue

                    for ay in ACADEMIC_YEARS:
                        sess = _create_session(
                            db, student, examiner, subtest_info, grade, ay, toy, atype,
                            risk_distribution, use_intelliscore=(subtest_info["id"].startswith("NLM") and random.random() < 0.3),
                        )
                        session_count += 1
                        score_count += len(sess.scores)
                        if sess.intelliscore_used:
                            intelliscore_count += 1

    db.commit()
    print(f"    Created {session_count} sessions so far (exhaustive coverage).")

    # Phase B: Bulk assessment data for remaining students
    print("  Phase B: Bulk assessment data for all students...")
    batch_size = 500
    for i, student in enumerate(active_students):
        if student.status != "active":
            continue

        eligible_subtests = [st for st in SUBTESTS if student.grade in st["grades"]]
        if not eligible_subtests:
            continue

        examiner = _get_examiner(student, org_users)
        if not examiner:
            continue

        n_sessions = random.choices([1, 2, 3, 4], weights=[30, 40, 20, 10])[0]
        chosen_subtests = random.sample(eligible_subtests, min(n_sessions, len(eligible_subtests)))

        for subtest_info in chosen_subtests:
            ay = random.choice(ACADEMIC_YEARS)
            toy = random.choice(TIMES_OF_YEAR)
            atype = random.choices(["benchmark", "progress_monitoring"], weights=[80, 20])[0]
            use_is = subtest_info["id"].startswith("NLM") and random.random() < 0.15

            sess = _create_session(
                db, student, examiner, subtest_info, student.grade, ay, toy, atype,
                risk_distribution, use_intelliscore=use_is,
            )
            session_count += 1
            score_count += len(sess.scores)
            if sess.intelliscore_used:
                intelliscore_count += 1

        if (i + 1) % batch_size == 0:
            db.commit()
            print(f"    ... {i + 1}/{len(active_students)} students processed ({session_count} sessions, {score_count} scores)")

    db.commit()
    print(f"  Total: {session_count} test sessions, {score_count} scores, {intelliscore_count} IntelliScore sessions.")

    # ------------------------------------------------------------------
    # 7. Update license usage
    # ------------------------------------------------------------------
    print("\n[7/8] Updating license usage counts...")
    for org in orgs:
        for ay in ACADEMIC_YEARS:
            lic = db.query(License).filter(
                License.organization_id == org.id, License.academic_year == ay
            ).first()
            if lic:
                unique = (
                    db.query(TestSession.student_id)
                    .join(Student)
                    .filter(Student.organization_id == org.id, TestSession.academic_year == ay)
                    .distinct()
                    .count()
                )
                lic.used = unique
    db.commit()
    print("  License usage updated.")

    # ------------------------------------------------------------------
    # 8. Generate CSV test file for bulk import coverage
    # ------------------------------------------------------------------
    print("\n[8/8] Generating sample CSV for bulk-import testing...")
    csv_path = Path(__file__).parent / "data" / "sample_import.csv"
    with open(csv_path, "w") as f:
        f.write("first_name,last_name,grade,student_id,school,district,gender,teacher_email\n")
        for i in range(50):
            fn = random.choice(FIRST_NAMES)
            ln = random.choice(LAST_NAMES)
            gr = random.choice(GRADES)
            f.write(f"{fn},{ln},{gr},CSV-{i+1:04d},Import Test School,Import District,{random.choice(GENDERS)},demo@insight.edu\n")
    print(f"  Saved to {csv_path}")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    print("\n" + "=" * 70)
    print("  SEED DATA COMPLETE")
    print("=" * 70)
    print(f"  Organizations:       {len(orgs)}")
    print(f"  Users:               {len(all_users)}")
    print(f"  Students:            {len(all_students)}")
    print(f"  Active students:     {sum(1 for s in all_students if s.status == 'active')}")
    print(f"  Inactive students:   {sum(1 for s in all_students if s.status == 'inactive')}")
    print(f"  Groups:              {group_count}")
    print(f"  Group memberships:   {group_membership_count}")
    print(f"  My Students links:   {assignment_count}")
    print(f"  Licenses:            {license_count}")
    print(f"  Test sessions:       {session_count}")
    print(f"  Scores:              {score_count}")
    print(f"  IntelliScore used:   {intelliscore_count}")
    print(f"  Countries:           US, AU")
    print(f"  States:              {sum(len(s) for s in GEOGRAPHY.values())}")
    print(f"  Districts:           {sum(len(d) for s in GEOGRAPHY.values() for d in s.values())}")
    print(f"  Schools:             {len(flat_schools)}")
    print(f"  Grades covered:      {', '.join(GRADES)}")
    print(f"  Subtests covered:    {', '.join(s['id'] for s in SUBTESTS)}")
    print(f"  Academic years:      {', '.join(ACADEMIC_YEARS)}")
    print(f"  Demo login:          demo@insight.edu / demo123")
    print("=" * 70)

    # Verify coverage
    _verify_coverage(db)


def _get_examiner(student, org_users):
    examiners = org_users.get(student.organization_id, [])
    return random.choice(examiners) if examiners else None


def _create_session(db, student, examiner, subtest_info, grade, ay, toy, atype,
                    risk_distribution, use_intelliscore=False):
    base_date = datetime.datetime(2025, 8, 15) if ay == "2025-2026" else datetime.datetime(2024, 8, 15)
    toy_offsets = {"BOY": 0, "MOY": 120, "EOY": 240}
    created = base_date + datetime.timedelta(days=toy_offsets.get(toy, 0) + random.randint(0, 30))
    completed = created + datetime.timedelta(minutes=random.randint(5, 45))

    form_ids = ["Form A", "Form B", "Form C", "Form D", "Form E"]

    sess = TestSession(
        student_id=student.id,
        examiner_id=examiner.id,
        subtest=subtest_info["id"],
        form_id=random.choice(form_ids),
        grade_at_test=grade,
        academic_year=ay,
        time_of_year=toy,
        assessment_type=atype,
        is_complete=True,
        intelliscore_used=use_intelliscore,
        created_at=created,
        completed_at=completed,
    )

    if use_intelliscore:
        sess.transcript = random.choice(SAMPLE_TRANSCRIPTS)
        sess.audio_file_path = f"/uploads/audio/session_{random.randint(10000,99999)}.webm"
        sess.audio_expires_at = completed + datetime.timedelta(days=14)

    db.add(sess)
    db.flush()

    desired_risk = random.choice(risk_distribution)

    for target in subtest_info["targets"]:
        benchmark_key = subtest_info["benchmark_keys"].get(target)

        if benchmark_key:
            raw = generate_score_for_risk(benchmark_key, grade, toy, desired_risk)
            risk = classify_risk(benchmark_key, grade, toy, raw)
        else:
            raw = round(random.uniform(0, 30), 1)
            risk = random.choice(["benchmark", "moderate", "high"])

        max_score_map = {
            "NLM_RETELL": 48, "NLM_QUESTIONS": 30, "DECODING_FLUENCY": 200,
            "PHONEME_SEGMENTATION": 20, "PHONEME_BLENDING": 20, "FIRST_SOUNDS": 20,
            "CONTINUOUS_PHONEME_BLENDING": 20,
            "PHONEME_DELETION": 20, "PHONEME_ADDITION": 20, "PHONEME_SUBSTITUTION": 20,
            "IRREGULAR_WORDS": 20, "LETTER_SOUNDS": 26, "LETTER_NAMES": 26,
            "CLOSED_SYLLABLES": 10, "VCE": 10, "BASIC_AFFIXES": 10, "VOWEL_TEAMS": 10,
            "VOWEL_R_CONTROLLED": 10, "ADVANCED_AFFIXES": 10, "COMPLEX_VOWELS": 10,
            "ADVANCED_WORD_FORMS": 10,
        }

        score = Score(
            test_session_id=sess.id,
            target=target,
            raw_score=raw,
            max_score=max_score_map.get(target, 20),
            risk_level=risk,
        )
        db.add(score)

        # Add sub-target scores for NLM targets
        sub_targets = SUB_TARGETS.get(target, [])
        for st in sub_targets:
            sub_score = Score(
                test_session_id=sess.id,
                target=target,
                sub_target=st,
                raw_score=round(random.uniform(0, 5), 1),
                max_score=5,
                risk_level=random.choice(["benchmark", "moderate", "high"]),
                notes=f"Sub-target {st} score" if random.random() < 0.1 else None,
            )
            db.add(sub_score)

    db.flush()
    return sess


def _verify_coverage(db):
    """Verify that every expected combination is covered in the seed data."""
    print("\n--- Coverage Verification ---")
    issues = []

    # Check all subtests present
    subtests_in_db = set(r[0] for r in db.query(TestSession.subtest).distinct().all())
    expected_subtests = {s["id"] for s in SUBTESTS}
    missing_subtests = expected_subtests - subtests_in_db
    if missing_subtests:
        issues.append(f"Missing subtests: {missing_subtests}")
    else:
        print(f"  All {len(expected_subtests)} subtests covered.")

    # Check all grades present
    grades_in_db = set(r[0] for r in db.query(Student.grade).distinct().all())
    expected_grades = set(GRADES)
    missing_grades = expected_grades - grades_in_db
    if missing_grades:
        issues.append(f"Missing grades: {missing_grades}")
    else:
        print(f"  All {len(expected_grades)} grades covered.")

    # Check all TOY present
    toys_in_db = set(r[0] for r in db.query(TestSession.time_of_year).distinct().all())
    if set(TIMES_OF_YEAR) - toys_in_db:
        issues.append(f"Missing TOY: {set(TIMES_OF_YEAR) - toys_in_db}")
    else:
        print(f"  All 3 time-of-year periods covered.")

    # Check both assessment types
    atypes = set(r[0] for r in db.query(TestSession.assessment_type).distinct().all())
    if {"benchmark", "progress_monitoring"} - atypes:
        issues.append(f"Missing assessment types: {{'benchmark', 'progress_monitoring'}} - {atypes}")
    else:
        print(f"  Both assessment types covered.")

    # Check risk levels in scores
    risks = set(r[0] for r in db.query(Score.risk_level).distinct().all() if r[0])
    expected_risks = {"benchmark", "moderate", "high"}
    if expected_risks - risks:
        issues.append(f"Missing risk levels: {expected_risks - risks}")
    else:
        print(f"  All risk levels covered: {risks}")

    # Check both academic years
    ays = set(r[0] for r in db.query(TestSession.academic_year).distinct().all())
    if set(ACADEMIC_YEARS) - ays:
        issues.append(f"Missing academic years")
    else:
        print(f"  Both academic years covered.")

    # Check user roles
    roles = set(r[0] for r in db.query(User.role).distinct().all())
    if {"admin", "examiner"} - roles:
        issues.append(f"Missing roles")
    else:
        print(f"  Both user roles covered.")

    # Check student statuses
    statuses = set(r[0] for r in db.query(Student.status).distinct().all())
    if {"active", "inactive"} - statuses:
        issues.append(f"Missing student statuses")
    else:
        print(f"  Both student statuses covered.")

    # Check countries
    countries = set(r[0] for r in db.query(Organization.country).distinct().all())
    if {"US", "AU"} - countries:
        issues.append(f"Missing countries")
    else:
        print(f"  Both countries covered: {countries}")

    # Check IntelliScore usage
    is_count = db.query(TestSession).filter(TestSession.intelliscore_used == True).count()
    transcript_count = db.query(TestSession).filter(TestSession.transcript.isnot(None)).count()
    if is_count == 0:
        issues.append("No IntelliScore sessions")
    else:
        print(f"  IntelliScore: {is_count} sessions, {transcript_count} with transcripts.")

    # Check groups exist
    grp_count = db.query(Group).count()
    if grp_count == 0:
        issues.append("No groups")
    else:
        print(f"  Groups: {grp_count}")

    # Check licenses exist
    lic_count = db.query(License).count()
    if lic_count == 0:
        issues.append("No licenses")
    else:
        print(f"  Licenses: {lic_count}")

    # Check My Students assignments
    ms_count = db.execute(user_students.select()).fetchall()
    if not ms_count:
        issues.append("No My Students assignments")
    else:
        print(f"  My Students assignments: {len(ms_count)}")

    # Check sub-targets
    sub_target_count = db.query(Score).filter(Score.sub_target.isnot(None)).count()
    if sub_target_count == 0:
        issues.append("No sub-target scores")
    else:
        print(f"  Sub-target scores: {sub_target_count}")

    # Check scores with notes
    notes_count = db.query(Score).filter(Score.notes.isnot(None)).count()
    if notes_count == 0:
        issues.append("No scores with notes")
    else:
        print(f"  Scores with notes: {notes_count}")

    # Check form_ids
    forms = set(r[0] for r in db.query(TestSession.form_id).distinct().all() if r[0])
    print(f"  Form IDs used: {forms}")

    # Check inactive users exist
    inactive_users = db.query(User).filter(User.is_active == False).count()
    print(f"  Inactive users: {inactive_users}")

    # Check all subtest/grade combos
    all_combos = set()
    for st in SUBTESTS:
        for g in st["grades"]:
            all_combos.add((st["id"], g))
    db_combos = set(
        db.query(TestSession.subtest, TestSession.grade_at_test).distinct().all()
    )
    missing_combos = all_combos - db_combos
    if missing_combos:
        issues.append(f"Missing subtest/grade combos: {missing_combos}")
    else:
        print(f"  All {len(all_combos)} subtest/grade combinations covered.")

    if issues:
        print(f"\n  ISSUES ({len(issues)}):")
        for issue in issues:
            print(f"    - {issue}")
    else:
        print("\n  100% COVERAGE VERIFIED.")


if __name__ == "__main__":
    main()
