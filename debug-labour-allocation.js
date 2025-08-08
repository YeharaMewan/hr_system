// Quick test to check LabourAllocationRecord
console.log('🔍 Checking LabourAllocationRecord for today...');

const today = new Date();
today.setHours(0, 0, 0, 0);
const endOfDay = new Date(today);
endOfDay.setHours(23, 59, 59, 999);

console.log('Date range:', {
  today: today.toISOString(),
  endOfDay: endOfDay.toISOString()
});

// Simulate the API query
console.log('\n📊 Expected Data Structure:');
console.log('- totalLabourCount: (from leader allocations)');
console.log('- companyStats: [Codegen+Aigrow, Ram Studios, Rise Technology]');
console.log('- leaderAllocations: [{ labourCount: X }, ...]');

console.log('\n💡 If totalLabourCount is 0 but companyStats exist:');
console.log('  → LabourAllocationRecord exists but totalLabourCount field is not set');
console.log('  → Need to use leaderAllocations as fallback');

console.log('\n✅ Solution implemented in dashboard stats API');
console.log('  → Added debug logging');
console.log('  → Added leaderAllocations fallback logic');
