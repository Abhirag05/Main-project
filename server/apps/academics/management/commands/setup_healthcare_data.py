"""Deprecated: no longer used."""

from django.core.management.base import BaseCommand
from django.apps import apps
from datetime import datetime


class Command(BaseCommand):
    help = "Setup healthcare and professional courses with modules and faculty"

    def handle(self, *args, **options):
        try:
            # Get models
            Course = apps.get_model('academics', 'Course')
            Module = apps.get_model('academics', 'Module')
            CourseModule = apps.get_model('academics', 'CourseModule')
            FacultyProfile = apps.get_model('faculty', 'FacultyProfile')
            User = apps.get_model('users', 'User')  # Using custom User model
            Centre = apps.get_model('centres', 'Centre')
            Role = apps.get_model('roles', 'Role')

            self.stdout.write(self.style.WARNING(
                'Removing old course data...'))
            # Delete old course-module associations first
            CourseModule.objects.filter(
                course__code__in=['B.TECH.CSE', 'B.TECH.ECE',
                                  'B.TECH.MECH', 'B.TECH.CIVIL', 'MCA.CSE']
            ).delete()

            # Delete old courses
            Course.objects.filter(code__in=[
                                  'B.TECH.CSE', 'B.TECH.ECE', 'B.TECH.MECH', 'B.TECH.CIVIL', 'MCA.CSE']).delete()

            # Delete old modules (if not used by other courses)
            for module_code in ['CS-101', 'CS-102', 'CS-103', 'CS-201', 'CS-202', 'CS-203']:
                module = Module.objects.filter(code=module_code).first()
                if module and not module.course_modules.exists():
                    module.delete()

            self.stdout.write(self.style.SUCCESS(
                '✓ Old courses and modules removed'))

            # Get or create centre and faculty role
            centre, _ = Centre.objects.get_or_create(
                code='MAIN001',
                defaults={'name': 'ISSD Main Centre', 'is_active': True}
            )

            faculty_role, _ = Role.objects.get_or_create(
                code='FACULTY',
                defaults={'name': 'Faculty', 'description': 'Faculty member'}
            )

            self.stdout.write(self.style.WARNING('Creating courses...'))

            # Course data with modules
            courses_data = {
                'DIA.HA': {
                    'name': 'Diploma in Hospital Administration',
                    'duration_months': 12,
                    'modules': [
                        ('HA-101', 'Healthcare Management Fundamentals',
                         'Introduction to healthcare systems and management principles'),
                        ('HA-102', 'Hospital Operations',
                         'Operational management of healthcare facilities'),
                        ('HA-103', 'Financial Management in Healthcare',
                         'Financial planning and budgeting for hospitals'),
                        ('HA-104', 'Healthcare Quality & Compliance',
                         'Quality assurance and regulatory compliance in healthcare'),
                    ]
                },
                'HM.CERT': {
                    'name': 'Healthcare Management Courses',
                    'duration_months': 6,
                    'modules': [
                        ('HM-101', 'Healthcare Systems',
                         'Overview of healthcare delivery systems'),
                        ('HM-102', 'Patient Care Management',
                         'Managing patient care and services'),
                        ('HM-103', 'Healthcare Leadership',
                         'Leadership skills in healthcare'),
                    ]
                },
                'DIA.WPM': {
                    'name': 'Diploma in Warehouse & Procurement Management',
                    'duration_months': 12,
                    'modules': [
                        ('WPM-101', 'Warehouse Operations',
                         'Management of warehouse facilities and inventory'),
                        ('WPM-102', 'Procurement Principles',
                         'Procurement planning and execution'),
                        ('WPM-103', 'Supply Chain Coordination',
                         'Coordinating supply chain activities'),
                        ('WPM-104', 'Inventory Management Systems',
                         'Systems and tools for inventory control'),
                    ]
                },
                'DIA.SCWL': {
                    'name': 'Diploma in Supply Chain, Warehouse and Logistics Management',
                    'duration_months': 18,
                    'modules': [
                        ('SCWL-101', 'Supply Chain Fundamentals',
                         'Basics of supply chain management'),
                        ('SCWL-102', 'Warehouse Management',
                         'Warehouse design and operations'),
                        ('SCWL-103', 'Logistics and Transportation',
                         'Logistics planning and transport management'),
                        ('SCWL-104', 'Supply Chain Technology',
                         'Technology solutions in supply chain'),
                        ('SCWL-105', 'Risk Management in Supply Chain',
                         'Identifying and managing supply chain risks'),
                    ]
                },
                'CERT.GCG': {
                    'name': 'Certificate Course in Geriatric Care Giving',
                    'duration_months': 6,
                    'modules': [
                        ('GCG-101', 'Geriatric Health Basics',
                         'Understanding aging and geriatric health'),
                        ('GCG-102', 'Elderly Care Practices',
                         'Care giving practices for elderly persons'),
                        ('GCG-103', 'Nutrition and Wellness',
                         'Nutrition management for elderly'),
                        ('GCG-104', 'Psychological Support for Elderly',
                         'Mental health and counseling for seniors'),
                    ]
                },
                'ACCA.DIP': {
                    'name': 'ACCA',
                    'duration_months': 36,
                    'modules': [
                        ('ACCA-101', 'Accounting Fundamentals',
                         'Foundations of accounting principles'),
                        ('ACCA-102', 'Financial Accounting',
                         'Financial accounting standards and practices'),
                        ('ACCA-103', 'Management Accounting',
                         'Management accounting and cost analysis'),
                        ('ACCA-104', 'Audit and Assurance',
                         'Auditing standards and assurance services'),
                        ('ACCA-105', 'International Taxation',
                         'International tax principles'),
                        ('ACCA-106', 'Strategic Business Leadership',
                         'Strategic management and leadership'),
                    ]
                },
                'EA.CERT': {
                    'name': 'Enrolled Agent [EA]',
                    'duration_months': 12,
                    'modules': [
                        ('EA-101', 'US Tax Fundamentals',
                         'US federal income tax basics'),
                        ('EA-102', 'Individual Taxation',
                         'Individual tax preparation'),
                        ('EA-103', 'Business Taxation',
                         'Business and entity taxation'),
                        ('EA-104', 'Tax Representation and Ethics',
                         'Tax practice representation and ethics'),
                    ]
                },
                'CMA.USA': {
                    'name': 'CMA USA',
                    'duration_months': 18,
                    'modules': [
                        ('CMA-101', 'Financial Reporting Analysis',
                         'Analysis of financial statements'),
                        ('CMA-102', 'Planning, Budgeting and Forecasting',
                         'Strategic planning and budgeting'),
                        ('CMA-103', 'Performance Management',
                         'Performance measurement and management'),
                        ('CMA-104', 'Cost Management',
                         'Cost analysis and management'),
                        ('CMA-105', 'Decision Analysis and Risk Management',
                         'Decision making and risk assessment'),
                    ]
                },
            }

            # Create courses
            created_modules = {}
            for course_code, course_info in courses_data.items():
                course, created = Course.objects.get_or_create(
                    code=course_code,
                    defaults={
                        'name': course_info['name'],
                        'duration_months': course_info['duration_months'],
                        'is_active': True,
                    }
                )

                if created:
                    self.stdout.write(self.style.SUCCESS(
                        f'  ✓ Created: {course.name}'))

                # Create modules for this course
                for module_code, module_name, module_desc in course_info['modules']:
                    module, mod_created = Module.objects.get_or_create(
                        code=module_code,
                        defaults={
                            'name': module_name,
                            'description': module_desc,
                            'is_active': True,
                        }
                    )

                    if mod_created:
                        self.stdout.write(
                            f'    ├─ Module: {module.code} - {module.name}')

                    # Create course-module association
                    sequence_order = course_info['modules'].index(
                        (module_code, module_name, module_desc)) + 1
                    CourseModule.objects.get_or_create(
                        course=course,
                        module=module,
                        defaults={'sequence_order': sequence_order,
                                  'is_active': True}
                    )

                    created_modules[module_code] = module

            self.stdout.write(self.style.SUCCESS(
                f'\n✓ All {len(courses_data)} courses created with modules'))

            # Create faculty members
            self.stdout.write(self.style.WARNING(
                '\nCreating faculty members...'))

            faculty_data = [
                ('Dr. Ramesh Kumar', 'ramesh.kumar@issd.edu', 'FK001',
                 'M.B.A, Ph.D. in Healthcare Management', 'Associate Professor'),
                ('Ms. Priya Singh', 'priya.singh@issd.edu',
                 'FK002', 'M.B.B.S, M.P.H', 'Assistant Professor'),
                ('Prof. Arun Verma', 'arun.verma@issd.edu', 'FK003',
                 'B.Tech, M.Tech in Supply Chain', 'Professor'),
                ('Dr. Anjali Sharma', 'anjali.sharma@issd.edu', 'FK004',
                 'Ph.D. in Logistics Management', 'Assistant Professor'),
                ('Mr. Suresh Patel', 'suresh.patel@issd.edu',
                 'FK005', 'ACCA, CPA', 'Lecturer'),
                ('Ms. Divya Nair', 'divya.nair@issd.edu', 'FK006',
                 'Geriatric Nursing Specialist', 'Instructor'),
                ('Mr. Vikram Singh', 'vikram.singh@issd.edu',
                 'FK007', 'EA, Tax Specialist', 'Lecturer'),
                ('Dr. Meera Joshi', 'meera.joshi@issd.edu', 'FK008',
                 'M.Com, Ph.D. in Finance', 'Associate Professor'),
                ('Prof. Rajesh Kumar', 'rajesh.kumar@issd.edu',
                 'FK009', 'MBA Finance, CMA', 'Professor'),
                ('Ms. Neha Gupta', 'neha.gupta@issd.edu', 'FK010',
                 'B.Pharmacy, PG Certificate in Hospital Management', 'Assistant Professor'),
            ]

            created_faculty_count = 0
            from datetime import date
            today = date.today()

            for full_name, email, employee_code, qualifications, designation in faculty_data:
                # Create user
                user, user_created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'full_name': full_name,
                        'role': faculty_role,
                        'centre': centre,
                        'is_active': True,
                    }
                )

                # Create faculty profile
                faculty, fac_created = FacultyProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        'employee_code': employee_code,
                        'designation': designation,
                        'joining_date': today,
                        'is_active': True,
                    }
                )

                if fac_created:
                    self.stdout.write(self.style.SUCCESS(
                        f'  ✓ {full_name} ({employee_code}) - {designation}'))
                    created_faculty_count += 1

            self.stdout.write(self.style.SUCCESS(
                f'\n✓ Created {created_faculty_count} faculty members'))

            self.stdout.write(self.style.SUCCESS('\n' + '='*60))
            self.stdout.write(self.style.SUCCESS(
                '✓ Healthcare and professional courses setup complete!'))
            self.stdout.write(self.style.SUCCESS('='*60))
            self.stdout.write(self.style.WARNING('\nSummary:'))
            self.stdout.write(f'  • Courses created: {len(courses_data)}')
            self.stdout.write(
                f'  • Total modules created: {len(created_modules)}')
            self.stdout.write(
                f'  • Faculty members created: {created_faculty_count}')
            self.stdout.write(self.style.WARNING(
                '\nNext step: Map faculties to courses/modules as needed'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {str(e)}'))
            import traceback
            traceback.print_exc()
