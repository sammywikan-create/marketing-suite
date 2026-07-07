import { NextResponse } from 'next/server';

// This timestamp is set at build time and stays constant per deployment
const BUILD_TIMESTAMP = Date.now().toString();

export async function GET() {
  return NextResponse.json({ 
    version: BUILD_TIMESTAMP,
    deployedAt: new Date(parseInt(BUILD_TIMESTAMP)).toISOString(),
  });
}
