export interface Instructor {
  id: string;
  name: string;
  avatarUrl: string | null;
  headline: string;
  bio: string;
  studentCount: number;
  courseCount: number;
  rating: number;
}
