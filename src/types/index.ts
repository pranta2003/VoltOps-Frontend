// These types mirror what the backend actually sends back. Keeping them
// here (instead of using "any" everywhere) means if the backend changes a
// field name, TypeScript immediately shows every place in the frontend
// that breaks — instead of us finding out by clicking around the app.

export type Role = "ADMIN" | "DISPATCHER" | "TECHNICIAN" | "CUSTOMER";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}
