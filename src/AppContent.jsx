// Device-adaptive page container moved verbatim from AppInner.
// Routes render via children to avoid a PageRoutes import cycle.
export function AppContent({ device, simulatorMode, children }) {
  return (
    <>
        {device === 'mobile' && simulatorMode === 'mobile' ? (
          <div className="flex-1 overflow-y-auto p-0 sm:p-2 lg:p-4 flex justify-center items-start bg-slate-100/70 dark:bg-slate-950/70 w-full overflow-x-hidden">
            <div
              className="w-full max-w-full lg:max-w-[460px] min-h-full lg:min-h-[calc(100vh-100px)] lg:rounded-3xl overflow-y-auto shadow-none lg:shadow-2xl border-0 lg:border border-slate-300 dark:border-slate-700 flex flex-col transition-all duration-300 is-mobile-view pb-24 lg:pb-6"
              style={{
                background: 'var(--bg-page)',
              }}
            >
              <div className="flex-1 p-3 sm:p-4 space-y-4 mobile-content-area overflow-x-hidden">
                {children}
              </div>
            </div>
          </div>
        ) : device === 'tablet' && simulatorMode === 'tablet' ? (
          <div className="flex-1 overflow-y-auto p-0 sm:p-2 lg:p-4 flex justify-center items-start bg-slate-100/70 dark:bg-slate-950/70 w-full overflow-x-hidden">
            <div
              className="w-full max-w-full lg:max-w-[840px] min-h-full lg:min-h-[calc(100vh-100px)] lg:rounded-3xl overflow-y-auto shadow-none lg:shadow-2xl border-0 lg:border border-slate-300 dark:border-slate-700 flex flex-col transition-all duration-300 is-tablet-view pb-24 lg:pb-6"
              style={{
                background: 'var(--bg-page)',
              }}
            >
              <div className="flex-1 p-3 sm:p-4 space-y-4 tablet-content-area overflow-x-hidden">
                {children}
              </div>
            </div>
          </div>
        ) : (
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-24 lg:pb-6 overflow-x-hidden">
            {children}
          </main>
        )}
    </>
  )
}
