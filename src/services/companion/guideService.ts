import {
  createGuide,
  getAllGuides,
  getGuideById,
  getGuideByStudentId,
  getGuidesByStudentId,
  toggleAvailability,
  updateGuideMe,
  type Guide,
  type GuideFilters,
} from '../../models/companion/guideModel.js';

export async function registerGuide(params: {
  student_id: string;
  department?: string;
  college?: string;
  hall?: string;
  year?: number;
  bio?: string;
  areas_of_expertise?: string[];
}): Promise<Guide> {
  return createGuide(params);
}

export async function browseGuides(filters: GuideFilters): Promise<Guide[]> {
  return getAllGuides(filters);
}

export async function getGuideProfile(guideId: string): Promise<Guide | null> {
  return getGuideById(guideId);
}

export async function getMyGuide(student_id: string): Promise<Guide | null> {
  return getGuideByStudentId(student_id);
}

export async function getMyGuides(student_id: string): Promise<Guide[]> {
  return getGuidesByStudentId(student_id);
}

export async function updateMyGuide(params: {
  guideId: string;
  student_id: string;
  department?: string | null;
  college?: string | null;
  hall?: string | null;
  year?: number | null;
  bio?: string | null;
  areas_of_expertise?: string[] | null;
  is_active?: boolean;
}): Promise<Guide | null> {
  return updateGuideMe(params);
}

export async function toggleMyAvailability(params: {
  guideId: string;
  student_id: string;
  availability_status: 'available' | 'in_class' | 'at_dorm';
}): Promise<Guide | null> {
  return toggleAvailability(params);
}

