const {test} = require('node:test');
const assert = require('node:assert/strict');
const {addActivity, activityDay} = require('./activity.js');
test('activity splits across local midnight and counts sessions once per day', () => {
 const from = new Date(2026,8,15,23,59,55).getTime(), to=from+10000;
 const data=addActivity({}, {from,to,id:'session-1',language:'fa'},0,to);
 assert.equal(data['2026-09-15'].seconds,5);
 assert.equal(data['2026-09-16'].seconds,5);
 addActivity(data,{from:to,to:to+10000,id:'session-1',language:'fa'},0,to+10000);
 assert.equal(data['2026-09-16'].seconds,15);
 assert.equal(data['2026-09-16'].sessions.length,1);
 assert.equal(data['2026-09-16'].languages.fa,15);
});
test('deletion boundary excludes buffered history; invalid and stale records rejected/pruned',()=>{
 const now=Date.now();
 let data=addActivity({}, {from:now-10000,to:now,id:'s',language:'en'},now-2000,now);
 assert.equal(data[activityDay(new Date(now))].seconds,2);
 assert.deepEqual(addActivity({}, {from:now-60000,to:now,id:'s',language:'en'},0,now),{});
 data['2020-01-01']={seconds:100,languages:{en:100},sessions:['old']};
 addActivity(data,{from:now,to:now+100,id:'s',language:'en'},0,now+100);
 assert.equal(data['2020-01-01'],undefined);
 assert.deepEqual(addActivity({}, {from:now-100,to:now,id:'s',language:'<script>'},0,now),{});
});
