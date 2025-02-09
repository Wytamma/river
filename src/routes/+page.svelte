<script lang="ts">
  // Import the required libraries and styles.
  import WebTorrent from 'webtorrent/dist/webtorrent.min';
  import 'video.js/dist/video-js.css';
  import Chromecast from "@silvermine/videojs-chromecast";
  import '@silvermine/videojs-chromecast/dist/silvermine-videojs-chromecast.css';
  import videojs from "video.js";
  import { onMount, onDestroy } from 'svelte';
  import { Toast, getToastStore } from '@skeletonlabs/skeleton';
  import type { ToastSettings } from '@skeletonlabs/skeleton';

  // Create a toast store for user messages.
  const toastStore = getToastStore();

  // Initialize Chromecast plugin for video.js.
  Chromecast(videojs);

  // Create a WebTorrent client instance.
  const client = new WebTorrent();

  let isLoading = false;
  /***********************
   * MAGNET LINK BUILDER *
   ***********************/
  // Define an array of trackers.
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

  // Some extra tracker parameters (if needed).
  const extras = "&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com";

  // Build tracker parameters by URL-encoding each tracker.
  const trackerParams = trackers
    .map(tracker => "&tr=" + encodeURIComponent(tracker))
    .join('');

  // The torrent hash is provided via an input field.
  let torrentHash: string = "";

  // Build the complete magnet link reactively.
  $: completeMagnetLink = `magnet:?xt=urn:btih:${torrentHash}${trackerParams}${extras}`;

  /****************************
   * VIDEO.JS & CHROMECAST SETUP *
   ****************************/
  export let options: any = {
    techOrder: ["chromecast", "html5"],
  };

  let videoPlayer: HTMLVideoElement;
  let player: any = null;

  /***********************
   * TORRENT STATISTICS  *
   ***********************/
  let numPeers = 0;
  let downloadSpeed = "";
  let uploadSpeed = "";
  let downloaded = "";
  let total = "";
  let progressPercent = 0;
  let currentTorrent: any = null;
  let statsInterval: any = null;

  /************************************
   * DYNAMIC VIDEO WIDTH (RESIZING)  *
   ************************************/
  let screenWidth = window.innerWidth;
  function updateScreenWidth() {
    screenWidth = window.innerWidth;
  }

  /**********************************************
   * SERVICE WORKER SETUP & DOWNLOAD TRIGGERING *
   **********************************************/
  // Flag to indicate that the service worker is ready.
  let swReady = false;

  onMount(() => {
    // Listen for window resize events.
    window.addEventListener('resize', updateScreenWidth);

    // Initialize video.js on the video element.
    player = videojs(videoPlayer, options, () => {
      player.chromecast();
      console.log('onPlayerReady', player);
      console.log('PLAYER Plugins', player.activePlugins_);
    });

    // Register the service worker for streaming.
    navigator.serviceWorker.register('./sw.min.js', { scope: './' }).then(reg => {
      const worker = reg.active || reg.waiting || reg.installing;
      if (!worker) return;
      function checkState(worker: ServiceWorker) {
        console.log('Worker state:', worker.state);
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
  });

  onDestroy(() => {
    window.removeEventListener('resize', updateScreenWidth);
    if (player) {
      player.dispose();
    }
    client.destroy();
  });

  /***********************
   * UTILITY: prettyBytes *
   ***********************/
  function prettyBytes(num: number): string {
    const units = ['B', 'kB', 'MB', 'GB', 'TB'];
    const unitIndex = Math.floor(Math.log(num) / Math.log(1000));
    return (num / Math.pow(1000, unitIndex)).toFixed(2) + ' ' + units[unitIndex];
  }

  /***********************
   * FILE LIST STORAGE   *
   ***********************/
  // Holds all files of the current torrent.
  let fileList: any[] = [];


  /***********************
   * TOGGLE FILE SELECTION *
   ***********************/
  // This function toggles file selection using the WebTorrent select/deselect API.
  // Note: Due to known issues (see dcposch answer on issue #164), this may require a workaround.
  function toggleSelect(file: any) {
    // Only allow selection for playable mp4 files.
    if (!file.name.endsWith('.mp4')) return;

    if (!file.isSelected) {
      // Select the file using the API. The optional [priority] is passed (here, using 1).
      file.select(1);
      file.isSelected = true;
    } else {
      // Deselect the file using the API. The optional [priority] is passed (here, using 1).
      file.deselect(1);
      file.isSelected = false;
    }
  }

  /***********************
   * DOWNLOAD FUNCTION   *
   ***********************/
  function download() {
    if (!swReady) {
      alert("Service worker not ready yet. Please try again shortly.");
      return;
    }
    console.log('Downloading torrent:', completeMagnetLink);
    isLoading = true;
    client.add(completeMagnetLink, torrent => {
      currentTorrent = torrent;
      console.log('Torrent:', torrent);
      // Save the list of files from the torrent.
      fileList = torrent.files;
      for (const file of fileList) {
        file.isSelected = false;
        file.deselect(1);
      }

      // Check if there is at least one playable .mp4 file.
      if (!torrent.files.some(file => file.name.endsWith('.mp4'))) {
        console.error('No .mp4 file found in torrent');
        const t: ToastSettings = {
          message: 'No playable .mp4 file found in torrent.',
        };
        toastStore.trigger(t);
        return;
      }

      // Start updating torrent stats.
      if (statsInterval) clearInterval(statsInterval);
      statsInterval = setInterval(() => {
        if (!torrent) return;
        numPeers = torrent.numPeers;
        downloadSpeed = prettyBytes(torrent.downloadSpeed) + '/s';
        uploadSpeed = prettyBytes(torrent.uploadSpeed) + '/s';
        downloaded = prettyBytes(torrent.downloaded);
        total = prettyBytes(torrent.length);
        progressPercent = Math.round(torrent.progress * 10000) / 100;
      }, 500);

      torrent.on('done', () => {
        clearInterval(statsInterval);
      });
      isLoading = false;
    });
  }

  /***********************
   * PLAY FILE FUNCTION  *
   ***********************/
  // This function streams a file into the video element.
  function playFile(file: any) {
    if (!file.name.endsWith('.mp4')) {
      const t: ToastSettings = {
        message: 'Selected file is not a playable mp4 file.',
      };
      toastStore.trigger(t);
      return;
    }
    console.log('Streaming file:', file);
    file.streamTo(videoPlayer);
    player.play();
    console.log('Ready to play!');
  }
</script>

<!-- MARKUP -->
<div>
  <!-- Input field for torrent hash and a button to start download -->
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

  <!-- Display live torrent statistics if a torrent is active -->
  {#if currentTorrent}
    <div class="stats" style="margin: 1em 0;">
      <p><strong>Connected Peers:</strong> {numPeers}</p>
      <p><strong>Download Speed:</strong> {downloadSpeed}</p>
      <p><strong>Upload Speed:</strong> {uploadSpeed}</p>
      <p>
        <strong>Downloaded:</strong> {downloaded} / {total}
      </p>
      <p><strong>Progress:</strong> {progressPercent}%</p>
    </div>

    <!-- List all files from the torrent with select/deselect checkboxes -->
    <div style="margin: 1em 0;">
      <h3>Files in Torrent:</h3>
      <ul>
        {#each fileList as file}
          <li style="display: flex; align-items: center; gap: 0.5em;">
            <!-- Checkbox: enabled only for playable mp4 files -->
            <input
              type="checkbox"
              disabled={!file.name.endsWith('.mp4')}
              checked={file.isSelected}
              on:change={() => toggleSelect(file)}
            />
            <span>{file.name} ({prettyBytes(file.length)})</span>
            <!-- Also show a play button next to playable files -->
            {#if file.name.endsWith('.mp4')}
              <button on:click={() => {toggleSelect(file);playFile(file)}}>Play</button>
            {:else}
              <span style="color: gray;">Not playable</span>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <!-- The video element that will stream the selected mp4 file.
       Its width resizes dynamically to match the screen width. -->
  <video
    bind:this={videoPlayer}
    class="video-js vjs-default-skin"
    controls
    style="width: {screenWidth}px;"
  >
    <track kind="captions" />
  </video>
</div>
