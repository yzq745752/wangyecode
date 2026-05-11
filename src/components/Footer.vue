<template>
  <footer class="border-t border-border-subtle py-12 mt-20 bg-bg-dark/50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div class="flex items-center gap-2 mb-4">
            <div class="w-2 h-2 rounded-full bg-primary animate-glow-pulse" />
            <h3 class="font-mono text-sm font-bold text-primary">~/blog</h3>
          </div>
          <p class="text-text-dim text-sm font-mono">
            const life = {
            <br>&nbsp;&nbsp;passion: 'coding',
            <br>&nbsp;&nbsp;thought: true
            <br>}
          </p>
        </div>

        <div>
          <h4 class="font-mono text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">navigation</h4>
          <ul class="space-y-2">
            <li>
              <router-link to="/" class="text-text-dim hover:text-primary text-sm font-mono transition-colors">
                <span class="text-primary">&gt;</span> ~/home
              </router-link>
            </li>
            <li>
              <router-link to="/about" class="text-text-dim hover:text-primary text-sm font-mono transition-colors">
                <span class="text-primary">&gt;</span> ~/about
              </router-link>
            </li>
          </ul>
        </div>

        <div>
          <h4 class="font-mono text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">contact</h4>
          <p class="text-text-dim text-sm font-mono">
            <span class="text-secondary">@</span> email: 954409711@qq.com
          </p>
        </div>
      </div>

      <div class="border-t border-border-subtle mt-8 pt-8 text-center">
        <p class="font-mono text-xs text-text-dim">
          <span class="text-primary">©</span> {{ new Date().getFullYear() }} ~/blog &mdash; all rights reserved.
        </p>
      </div>
    </div>
  </footer>
</template>
