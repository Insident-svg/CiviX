import { Department } from '../models/Department.js';
import { Officer } from '../models/Officer.js';
import { Ward } from '../models/Ward.js';

const ALLOWED_DEPARTMENT_CODES = new Set([
  'pwd',
  'water_board',
  'sanitation',
  'electricity_board',
  'sewerage',
  'traffic_police',
  'police',
  'health',
  'other',
]);

const CATEGORY_TO_DEPARTMENT: Record<
  string,
  string
> = {
  road: 'pwd',
  water: 'water_board',
  sanitation: 'sanitation',
  electrical: 'electricity_board',
  sewerage: 'sewerage',
  traffic: 'traffic_police',
  public_safety: 'police',
  healthcare: 'health',
  emergency: 'police',
  other: 'other',
};

export async function routeGrievance(
  grievance: any,
  departments: string[],
) {
  const ward =
    await Ward.findOne({
      boundary: {
        $geoIntersects: {
          $geometry:
            grievance.location,
        },
      },
    });

  if (ward) {
    grievance.wardId =
      ward._id;
  }

  const candidateCodes = [
    ...(Array.isArray(departments) ? departments : []),
    CATEGORY_TO_DEPARTMENT[grievance.category] ?? 'other',
    'other',
  ]
    .filter((code): code is string => typeof code === 'string' && code.trim().length > 0)
    .map((code) => code.trim().toLowerCase())
    .filter((code) => ALLOWED_DEPARTMENT_CODES.has(code));

  let department = null;
  for (const code of candidateCodes) {
    department = await Department.findOne({ code, active: true });
    if (department) break;
  }

  if (!department) {
    department = await Department.findOne({ code: 'other', active: true });
  }

  if (!department) {
    return { ward, department: null, officer: null };
  }

  grievance.departmentId =
    department._id;

  const officerQuery: Record<
    string,
    unknown
  > = {
    departmentIds:
      department._id,

    active: true,
  };

  if (ward) {
    officerQuery.wardIds =
      ward._id;
  }

  let officer =
    await Officer.findOne(
      officerQuery,
    );

  /*
   * If no officer is available
   * for the detected ward, try
   * another officer from the
   * same department.
   */
  if (!officer) {
    officer =
      await Officer.findOne({
        departmentIds:
          department._id,

        active: true,
      });
  }

  if (officer) {
    grievance.officerId =
      officer._id;

    grievance.status =
      'ASSIGNED';
  }

  return {
    ward,

    department,

    officer,
  };
}