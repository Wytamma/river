<script lang="ts">
  // -------------------------
  // IMPORTS & DEPENDENCIES
  // -------------------------
  import { onMount, onDestroy } from 'svelte';
  import WebTorrent from 'webtorrent/dist/webtorrent.min';
  import videojs from 'video.js';
  import 'video.js/dist/video-js.css';
  import Chromecast from '@silvermine/videojs-chromecast';
  import '@silvermine/videojs-chromecast/dist/silvermine-videojs-chromecast.css';
  import moment from 'moment';
  import { Toast, getToastStore } from '@skeletonlabs/skeleton';
  import type { ToastSettings } from '@skeletonlabs/skeleton';

  // Initialize Chromecast for videojs.
  Chromecast(videojs);

  // Create a toast store for user messages.
  const toastStore = getToastStore();

  // -------------------------
  // STATE & VARIABLES
  // -------------------------
  // Create a WebTorrent client.
  const client = new WebTorrent();

  // References for torrent, video.js player, and the HTML video element.
  let isLoading = false;
  let currentTorrent: any = null;
  let player: any = null;
  let videoPlayer: HTMLVideoElement;

  // Video.js player options.
  export let options: any = {
    autoplay: true,
    muted: true,
    techOrder: ['chromecast', 'html5', 'flash']
  };

  // Torrent statistics.
  let numPeers = 0;
  let downloadSpeed = "";
  let uploadSpeed = "";
  let downloaded = "";
  let total = "";
  let progressPercent = 0;
  let remaining = "";
  let statsInterval: any = null;

  // List of files from the torrent.
  let fileList: any[] = [];

  // Torrent hash (input by the user).
  let torrentHash: string = "";

  // -------------------------
  // TRACKERS & MAGNET LINK BUILDER
  // -------------------------
  const trackers = [
    "udp://explodie.org:6969/announce",
    "udp://tracker.coppersurfer.tk:6969/announce",
    "udp://tracker.empire-js.us:1337/announce",
    "udp://tracker.leechers-paradise.org:6969/announce",
    "udp://tracker.opentrackr.org:1337/announce",
    "wss://tracker.btorrent.xyz",
    "wss://tracker.openwebtorrent.com",
    "udp://open.demonii.com:1337/announce",
    "udp://open.tracker.cl:1337/announce",
    "udp://open.stealth.si:80/announce",
    "udp://exodus.desync.com:6969/announce",
    "udp://tracker.torrent.eu.org:451/announce",
    "udp://tracker.tiny-vps.com:6969/announce",
    "udp://tracker.theoks.net:6969/announce",
    "udp://tracker.skyts.net:6969/announce",
    "udp://ns-1.x-fins.com:6969/announce",
    "udp://discord.heihachi.pw:6969/announce",
    "http://www.genesis-sp.org:2710/announce",
    "http://tracker.xiaoduola.xyz:6969/announce",
    "http://tracker.lintk.me:2710/announce",
    "http://tracker.bittor.pw:1337/announce",
    "http://t.jaekr.sh:6969/announce",
    "http://shubt.net:2710/announce",
    "http://servandroidkino.ru:80/announce",
    "http://buny.uk:6969/announce"
  ];

  const extras =
    "&tr=udp%3A%2F%2Fexplodie.org%3A6969" +
    "&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969" +
    "&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337" +
    "&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969" +
    "&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337" +
    "&tr=wss%3A%2F%2Ftracker.btorrent.xyz" +
    "&tr=wss%3A%2F%2Ftracker.fastcast.nz" +
    "&tr=wss%3A%2F%2Ftracker.openwebtorrent.com";

  const trackerParams = trackers.map(tracker => "&tr=" + encodeURIComponent(tracker)).join('');
  $: completeMagnetLink = `magnet:?xt=urn:btih:${torrentHash}${trackerParams}${extras}`;

  // -------------------------
  // SERVICE WORKER FLAG
  // -------------------------
  let swReady = false;

  // -------------------------
  // INITIALIZATION FUNCTION
  // -------------------------
  function init() {
    // Initialize video.js on the video element.
    player = videojs(videoPlayer, options, () => {
      player.chromecast();
      console.log('Player ready:', player);
    });

    // Register the service worker for streaming.
    navigator.serviceWorker.register('./sw.min.js', { scope: './' }).then(reg => {
      const worker = reg.active || reg.waiting || reg.installing;
      if (!worker) return;
      function checkState(worker: ServiceWorker) {
        console.log('Service Worker state:', worker.state);
        if (worker.state === 'activated') {
          client.createServer({ controller: reg });
          swReady = true;
          return true;
        }
        return false;
      }
      if (!checkState(worker)) {
        worker.addEventListener('statechange', ({ target }) => {
          if (target instanceof ServiceWorker) {
            checkState(target);
          }
        });
      }
    });
  }

  // -------------------------
  // COMPONENT LIFECYCLE
  // -------------------------
  onMount(() => {
    // Automatically initialize on both mobile and desktop.
    init();
  });

  onDestroy(() => {
    window.removeEventListener('resize', updateScreenWidth);
    if (player) player.dispose();
    if (client) client.destroy();
    if (statsInterval) clearInterval(statsInterval);
  });

  // -------------------------
  // RESIZING HANDLER
  // -------------------------
  let screenWidth = window.innerWidth;
  function updateScreenWidth() {
    screenWidth = window.innerWidth;
  }
  window.addEventListener('resize', updateScreenWidth);

  // -------------------------
  // ERROR & WARNING HANDLERS
  // -------------------------
  function onError(err: any) {
    alert(err);
    console.error(err);
  }
  function onWarning(err: any) {
    console.warn(err);
  }

  // -------------------------
  // DOWNLOAD FUNCTION
  // -------------------------
  function download() {
    if (!swReady) {
      alert("Service worker not ready yet. Please try again shortly.");
      return;
    }
    console.log('Downloading torrent:', completeMagnetLink);
    isLoading = true;
    client.add(completeMagnetLink, torrent => {
      currentTorrent = torrent;
      console.log('Torrent loaded:', torrent);
      fileList = torrent.files;
      // Initialize file selection status.
      for (const file of fileList) {
        file.isSelected = true;
        file.select(1);
      }

      // Ensure at least one playable .mp4 file is available.
      if (!torrent.files.some((file: any) => file.name.endsWith('.mp4'))) {
        console.error('No playable .mp4 file found in torrent');
        const t: ToastSettings = { message: 'No playable .mp4 file found in torrent.' };
        toastStore.trigger(t);
        return;
      }

      torrent.on('error', onError);
      torrent.on('warning', onWarning);
      torrent.on('done', () => {
        clearInterval(statsInterval);
      });

      // Update torrent statistics every 500 ms.
      if (statsInterval) clearInterval(statsInterval);
      statsInterval = setInterval(() => {
        if (!torrent) return;
        numPeers = torrent.numPeers;
        downloadSpeed = prettyBytes(torrent.downloadSpeed) + '/s';
        uploadSpeed = prettyBytes(torrent.uploadSpeed) + '/s';
        downloaded = prettyBytes(torrent.downloaded);
        total = prettyBytes(torrent.length);
        progressPercent = Math.round(torrent.progress * 10000) / 100;
        if (torrent.done) {
          remaining = 'Done.';
        } else {
          let rem = moment.duration(torrent.timeRemaining / 1000, 'seconds').humanize();
          remaining = rem.charAt(0).toUpperCase() + rem.slice(1) + ' remaining.';
        }
      }, 500);
      isLoading = false;
    });
  }

  // -------------------------
  // PLAY FILE FUNCTION
  // -------------------------
  function playFile(file: any) {
    if (!file.name.endsWith('.mp4')) {
      const t: ToastSettings = { message: 'Selected file is not a playable mp4 file.' };
      toastStore.trigger(t);
      return;
    }
    console.log('Streaming file:', file);
    file.streamTo(videoPlayer);
    console.log('Ready to play!');
    player.play();
  }

  // -------------------------
  // TOGGLE FILE SELECTION
  // -------------------------
  function toggleSelect(file: any) {
    if (!file.name.endsWith('.mp4')) return;
    if (!file.isSelected) {
      file.select(1);
      file.isSelected = true;
    } else {
      file.deselect(1);
      file.isSelected = false;
    }
  }

  // -------------------------
  // UTILITY FUNCTION: prettyBytes
  // -------------------------
  function prettyBytes(num: number): string {
    const units = ['B', 'kB', 'MB', 'GB', 'TB'];
    if (num === 0) return '0 B';
    const unitIndex = Math.floor(Math.log(num) / Math.log(1000));
    return (num / Math.pow(1000, unitIndex)).toFixed(2) + ' ' + units[unitIndex];
  }
</script>

<!--
  ========================================================
  MARKUP:
  ========================================================
  The markup displays the torrent hash input, download button, torrent
  statistics, file list with selection and play functionality, and the video element.
  (No overlay is used here.)
-->
<div>
  <!-- Torrent hash input & download button -->
  <div style="margin: 1em 0;">
    <label for="torrentHash">Torrent Hash:</label>
    <input
      class="input"
      id="torrentHash"
      type="text"
      bind:value={torrentHash}
      placeholder="Enter torrent hash"
      disabled={isLoading}
    />
    <button type="button" class="btn variant-filled" on:click={download} disabled={isLoading}>
      {#if isLoading}
        <span>Loading...</span>
      {:else}
      Start Download
      {/if}
    </button>
  </div>

  <!-- Live torrent statistics -->
  {#if currentTorrent}
    <div class="stats" style="margin: 1em 0;">
      <p><strong>Connected Peers:</strong> {numPeers}</p>
      <p><strong>Download Speed:</strong> {downloadSpeed}</p>
      <p><strong>Upload Speed:</strong> {uploadSpeed}</p>
      <p><strong>Downloaded:</strong> {downloaded} / {total}</p>
      <p><strong>Progress:</strong> {progressPercent}%</p>
      <p><strong>Remaining:</strong> {remaining}</p>
    </div>

    <!-- File list with selection and play button -->
    <div style="margin: 1em 0;">
      <h3>Files in Torrent:</h3>
      <ul>
        {#each fileList as file}
          <li style="display: flex; align-items: center; gap: 0.5em;">
            <input
              type="checkbox"
              disabled={!file.name.endsWith('.mp4')}
              checked={file.isSelected}
              on:change={() => toggleSelect(file)}
            />
            <span>{file.name} ({prettyBytes(file.length)})</span>
            {#if file.name.endsWith('.mp4')}
              <button on:click={() => { {
                  playFile(file); 
                }}}>Play</button>
            {:else}
              <span style="color: gray;">Not playable</span>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <!-- Video element -->
    <video
      bind:this={videoPlayer}
      class="video-js vjs-default-skin"
      controls
      style="width: {screenWidth}px;"
    >
      <track kind="captions" />
    </video>
</div>
