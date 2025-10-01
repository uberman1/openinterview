import type { Server } from 'http';
export function attachShutdown(server: Server, log: (s:string)=>void = console.log){
  const close = (sig: string) => {
    log(`[ops] received ${sig}, shutting down...`);
    server.close(err => {
      if (err) { log(`[ops] server close error: ${err?.message||String(err)}`); process.exit(1); }
      else { log('[ops] server closed'); process.exit(0); }
    });
    setTimeout(()=> process.exit(0), 5000).unref();
  };
  process.on('SIGINT', () => close('SIGINT'));
  process.on('SIGTERM', () => close('SIGTERM'));
}
