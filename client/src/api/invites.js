import api from "./axios";

export async function createInvite(email) {
  const { data } = await api.post("invites", { email }, { withCredentials: true });
  return data;
}

export async function listInvites() {
  const { data } = await api.get("invites", { withCredentials: true });
  return data;
}

export async function listRecruiters() {
  const { data } = await api.get("invites/recruiters", { withCredentials: true });
  return data;
}

export async function resendInvite(inviteId) {
  const { data } = await api.post(`invites/${inviteId}/resend`, {}, { withCredentials: true });
  return data;
}

export async function revokeInvite(inviteId) {
  const { data } = await api.post(`invites/${inviteId}/revoke`, {}, { withCredentials: true });
  return data;
}

export async function verifyInviteToken(token) {
  try {
    const { data } = await api.get(`invites/verify/${token}`);
    return data.data;
  } catch {
    return null;
  }
}
