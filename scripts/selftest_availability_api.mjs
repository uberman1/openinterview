import request from 'supertest';
import app from '../index.js';

let pass=0, fail=0;
const ok=(cond,msg)=>{ if(cond){ pass++; console.log('✔',msg);} else { fail++; console.log('✘',msg);} };

(async function run(){
  // seed simple Mon hours for u1
  const av = {
    userId:'u1',
    timezone:'UTC',
    weekly:{ Mon:[['09:00','12:00']], Tue:[], Wed:[], Thu:[], Fri:[], Sat:[], Sun:[] },
    rules:{ minNoticeMinutes:0, windowDays:60, incrementsMinutes:30, bufferBeforeMinutes:0, bufferAfterMinutes:0, maxPerDay:20, durations:[30], defaultDuration:30 },
    exceptions:[]
  };
  const save = await request(app).post('/api/availability').send(av);
  ok(save.status===200, 'POST /api/availability saved');

  function nextMondayISO(){
    const now = new Date();
    const day = now.getUTCDay();
    const delta = (8 - day) % 7 || 7;
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()+delta));
    return d.toISOString().slice(0,10);
  }
  const date = nextMondayISO();

  const s = await request(app).get('/api/slots').query({userId:'u1', date, duration:30});
  ok(s.status===200, 'GET /api/slots responds');
  ok(Array.isArray(s.body.slots), 'slots is an array');
  ok(JSON.stringify(s.body.slots) === JSON.stringify(['09:00','09:30','10:00','10:30','11:00','11:30']), 'expected 6 slots');

  const av2 = {...av, exceptions:[{date, type:'block'}]};
  const save2 = await request(app).post('/api/availability').send(av2);
  ok(save2.status===200, 'updated availability with block');
  const s2 = await request(app).get('/api/slots').query({userId:'u1', date, duration:30});
  ok(s2.body.slots.length===0, 'blocked date returns 0 slots');

  console.log(`\nSummary: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
