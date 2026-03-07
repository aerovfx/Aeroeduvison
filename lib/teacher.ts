import { isTeacher as checkIsTeacher } from "./permissions";

export const isTeacher = (role?: string | null) => {
  return checkIsTeacher(role);
}