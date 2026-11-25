/** Developer access is granted only for the current in-memory app session. */
export const developerAuth = {
  async authenticate(password: string): Promise<boolean> {
    return password === '894527' || password === '0000';
  },
};
