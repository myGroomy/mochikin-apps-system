import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('mochikin_sso');
  response.cookies.delete('sso_token');
  response.cookies.delete('mochikin_portal_url');
  response.cookies.delete('mochikin_active_branch_code');
  response.cookies.delete('mochikin_active_branch_name');
  return response;
}
