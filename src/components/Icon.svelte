<script lang="ts">
  // Small stroke icons, drawn inline so they work offline and follow the text color.
  const PATHS = {
    home: 'M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1Z',
    box: 'M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5ZM3.5 7.5 12 12l8.5-4.5M12 12v9',
    coins: 'M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3ZM4 5v5c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 10v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5M4 15v4c0 1.7 3.6 3 8 3s8-1.3 8-3v-4',
    settings:
      'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 5 5',
    share: 'M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
    plus: 'M12 5v14M5 12h14',
    back: 'M15 5l-7 7 7 7',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    x: 'M6 6l12 12M18 6 6 18',
    copy: 'M9 9h11v12H9ZM5 15H4V3h11v1',
    link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    calendar: 'M4 6h16v15H4ZM4 10h16M8 3v5M16 3v5',
    bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4ZM10 21h4',
    belloff: 'M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l2 2H4M10 21h4M3 3l18 18',
    grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
    camera: 'M4 8h3l2-3h6l2 3h3v12H4ZM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
    paste: 'M9 3h6v3H9ZM7 4.5H5V21h14V4.5h-2M9 12h6M9 16h4',
  } as const;

  let { name, size = 22, stroke = 2 }: { name: keyof typeof PATHS; size?: number; stroke?: number } = $props();
  // Dots need a heavier stroke to read as dots.
  const dots = $derived(name === 'more' || name === 'grip');
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={dots ? 3.2 : stroke}
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"><path d={PATHS[name]} /></svg>
