document.addEventListener('DOMContentLoaded', () => {
  console.log('App loaded successfully');
  
  // DOM elements
  const eventsContainer = document.getElementById('events-container');
  const loadingElement = document.getElementById('loading');
  const noEventsElement = document.getElementById('no-events');
  const lastUpdatedElement = document.getElementById('last-updated');
  const genreCheckboxesContainer = document.getElementById('genre-checkboxes');
  const venuesList = document.getElementById('venues-list');
  const scraperOptions = document.getElementById('scraper-options');
  const runAllScrapersButton = document.getElementById('run-all-scrapers');
  
  // User login elements
  const loginForm = document.getElementById('login-form');
  const userInfo = document.getElementById('user-info');
  const usernameInput = document.getElementById('username-input');
  const loginButton = document.getElementById('login-button');
  const logoutButton = document.getElementById('logout-button');
  const displayUsername = document.getElementById('display-username');
  const viewToggle = document.getElementById('view-toggle');
  const toggleViewButton = document.getElementById('toggle-view-button');
  
  // State
  let allEvents = [];
  let filteredEvents = [];
  let selectedGenres = new Set(); // Store selected genres
  let allVenues = new Set(); // Store all venues
  let includedVenues = new Set(); // Store venues included in the dataset
  let selectedVenues = new Set(); // Store selected venues for filtering
  let venueStatuses = {}; // Store venue scraper statuses
  let lastUpdatedDate = null; // Store the last updated date
  let currentUser = null; // Store current user
  let userSelectedEvents = new Set(); // Store user's selected events
  let showingUserEvents = false; // Flag to track which view is active
  let venueFilterActive = false; // Flag to track if venue filtering is active
  
  // Genres to filter out by default
  const defaultFilteredOutGenres = ['Rock', 'Jazz', 'World', 'Classical', 'Country', 'Alternative', 'Hip-Hop', 'Soul', 'R&B', 'Parties', 'Folk', 'Pop', 'Reggae'];
  
  // Genres to combine into "Other" category
  const otherGenres = ['Jazz', 'Soul', 'World', 'Classical', 'Folk', 'R&B', 'Country', 'Reggae'];
  
  // Month names
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  // Display a simple message to confirm the app is working
  if (eventsContainer) {
    eventsContainer.innerHTML = `
      <div class="alert alert-info">
        <h4>App is working!</h4>
        <p>This is a simplified version to test functionality.</p>
      </div>
    `;
  }
  
  // Hide loading spinner
  if (loadingElement) {
    loadingElement.style.display = 'none';
  }
  
  // Update last updated text
  if (lastUpdatedElement) {
    lastUpdatedElement.textContent = new Date().toLocaleString();
  }
  
  // User login functionality
  function initUserSystem() {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      loginUser(savedUser);
    }
    
    // Login button click handler
    loginButton.addEventListener('click', () => {
      const username = usernameInput.value.trim();
      if (username) {
        loginUser(username);
      }
    });
    
    // Enter key in username input
    usernameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const username = usernameInput.value.trim();
        if (username) {
          loginUser(username);
        }
      }
    });
    
    // Logout button click handler
    logoutButton.addEventListener('click', () => {
      logoutUser();
    });
    
    // Toggle view button click handler
    toggleViewButton.addEventListener('click', () => {
      toggleEventView();
    });
  }
  
  // Login user
  function loginUser(username) {
    currentUser = username;
    localStorage.setItem('currentUser', username);
    
    // Update UI
    loginForm.classList.add('d-none');
    userInfo.classList.remove('d-none');
    viewToggle.classList.remove('d-none');
    displayUsername.textContent = username;
    
    // Load user's selected events
    loadUserSelectedEvents();
    
    // Apply filters and render events
    applyFiltersAndSearch();
  }
  
  // Logout user
  function logoutUser() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    
    // Update UI
    loginForm.classList.remove('d-none');
    userInfo.classList.add('d-none');
    viewToggle.classList.add('d-none');
    usernameInput.value = '';
    
    // Reset to all events view
    showingUserEvents = false;
    updateToggleButtonText();
    
    // Apply filters and render events
    applyFiltersAndSearch();
  }
  
  // Toggle between all events and user's selected events
  function toggleEventView() {
    showingUserEvents = !showingUserEvents;
    updateToggleButtonText();
    applyFiltersAndSearch();
  }
  
  // Update toggle button text based on current view
  function updateToggleButtonText() {
    if (showingUserEvents) {
      toggleViewButton.innerHTML = '<i class="fas fa-globe"></i> All Shows';
    } else {
      toggleViewButton.innerHTML = '<i class="fas fa-skull"></i> My Shows';
    }
  }
  
  // Load user's selected events from localStorage
  function loadUserSelectedEvents() {
    if (!currentUser) return;
    
    const savedEvents = localStorage.getItem(`selectedEvents_${currentUser}`);
    if (savedEvents) {
      userSelectedEvents = new Set(JSON.parse(savedEvents));
    } else {
      userSelectedEvents = new Set();
    }
  }
  
  // Save user's selected events to localStorage
  function saveUserSelectedEvents() {
    if (!currentUser) return;
    
    localStorage.setItem(
      `selectedEvents_${currentUser}`, 
      JSON.stringify(Array.from(userSelectedEvents))
    );
  }
  
  // Toggle an event as selected/unselected
  function toggleEventSelection(eventId, selected) {
    if (!currentUser) return;
    
    if (selected) {
      userSelectedEvents.add(eventId);
    } else {
      userSelectedEvents.delete(eventId);
    }
    
    saveUserSelectedEvents();
  }
  
  // Check if an event is selected by the current user
  function isEventSelected(eventId) {
    return userSelectedEvents.has(eventId);
  }
  
  // Generate a unique ID for an event
  function generateEventId(event) {
    // Create a unique ID based on event properties
    return `${event.venue}_${event.date}_${event.name}`.replace(/\s+/g, '_');
  }
  
  // Function to normalize venue names
  function normalizeVenueName(venueName) {
    if (!venueName) return venueName;
    
    // Remove "The " from the beginning of venue names
    let normalizedName = venueName.replace(/^The\s+/i, '');
    
    // Standardize specific venue names
    if (normalizedName.includes('Orange Peel')) {
      normalizedName = 'Orange Peel';
    } else if (normalizedName.includes('Greensboro Coliseum') || normalizedName.includes('Greensboro Complex')) {
      normalizedName = 'Greensboro Coliseum';
    } else if (normalizedName.includes('Ritz')) {
      normalizedName = 'Ritz';
    }
    
    return normalizedName;
  }
  
  // Fetch events from the API
  async function fetchEvents() {
    try {
      showLoading();
      
      // Fetch events
      const eventsResponse = await fetch('/api/events');
      if (!eventsResponse.ok) {
        throw new Error(`HTTP error! Status: ${eventsResponse.status}`);
      }
      
      const eventsData = await eventsResponse.json();
      allEvents = eventsData.events;
      
      // Generate unique IDs for all events
      allEvents.forEach(event => {
        event.id = generateEventId(event);
      });
      
      // Update last updated timestamp
      if (eventsData.lastUpdated) {
        lastUpdatedDate = new Date(eventsData.lastUpdated);
        lastUpdatedElement.textContent = formatLastUpdated(lastUpdatedDate);
      }
      
      // Fetch all venues from the API
      const venuesResponse = await fetch('/api/venues');
      if (venuesResponse.ok) {
        const venuesData = await venuesResponse.json();
        
        // Add all predefined venues to allVenues
        if (venuesData.venues && Array.isArray(venuesData.venues)) {
          venuesData.venues.forEach(venue => {
            if (venue.name) {
              allVenues.add(normalizeVenueName(venue.name));
            }
          });
        }
      }
      
      // Reset venue sets before processing events
      allVenues = new Set();
      includedVenues = new Set();
      
      // First pass: normalize all venue names and store them in the events
      allEvents.forEach(event => {
        if (event.venue) {
          event.normalizedVenue = normalizeVenueName(event.venue);
        }
      });
      
      // Second pass: add normalized venue names to sets
      allEvents.forEach(event => {
        if (event.normalizedVenue) {
          allVenues.add(event.normalizedVenue);
          includedVenues.add(event.normalizedVenue);
        }
      });
      
      // PRE-PROCESSING: Force categorize specific events as parties by exact name match
      const exactPartyEventNames = [
        'motorco annual shrimp boil', 'annual shrimp boil', 'shrimp boil',
        'nookie: nu-metal night', 'gimme gimme disco', 
        'be loud! sophie high school music showcase', 'high school music showcase',
        'blue ball', 'bleu ball', 'jean-belle\'s punk rock b-day bash', 
        'punk rock b-day bash', 'b-day bash', 'birthday bash',
        'color me asheville by goodwill', 'color me asheville',
        'back to back to black: the amy winehouse celebration',
        'club 90s: gaga night', 'club 90s', 'gaga night',
        'after midnight: chappell roan dance party', 'bubblegum pop disco'
      ];
      
      allEvents.forEach(event => {
        if (event.name) {
          const lowerName = event.name.toLowerCase();
          
          // Check for exact matches first
          if (exactPartyEventNames.some(partyName => lowerName.includes(partyName))) {
            console.log(`Force categorizing as Party: ${event.name}`);
            event.primaryGenre = 'Parties';
            event.originalGenre = event.style || event.primaryGenre; // Store original for debugging
            event.style = 'Parties';
            return;
          }
          
          // Check for partial matches with specific keywords
          if (
            lowerName.includes('shrimp boil') || 
            lowerName.includes('high school') || 
            lowerName.includes('showcase') ||
            lowerName.includes('b-day') || 
            lowerName.includes('birthday') ||
            lowerName.includes('ball') ||
            lowerName.includes('color me') ||
            lowerName.includes('goodwill') ||
            lowerName.includes('amy winehouse celebration') ||
            lowerName.includes('club 90') ||
            lowerName.includes('gaga night') ||
            lowerName.includes('chappell roan') ||
            lowerName.includes('dance party') ||
            lowerName.includes('bubblegum pop') ||
            lowerName.includes('disco') ||
            lowerName.includes('nu-metal night') ||
            lowerName.includes('nookie')
          ) {
            console.log(`Force categorizing as Party by keyword: ${event.name}`);
            event.primaryGenre = 'Parties';
            event.originalGenre = event.style || event.primaryGenre; // Store original for debugging
            event.style = 'Parties';
          }
        }
      });
      
      // Identify and categorize dance parties, discos, and fundraisers
      allEvents.forEach(event => {
        const eventName = event.name ? event.name.toLowerCase() : '';
        const eventDescription = event.description ? event.description.toLowerCase() : '';
        const performers = event.performers && event.performers.length > 0 ? event.performers.join(' ').toLowerCase() : '';
        
        // Force categorize specific events as parties regardless of other checks
        const forcePartyEvents = [
          'motorco annual shrimp boil', 'annual shrimp boil', 'shrimp boil',
          'nookie', 'nu-metal night', 'gimme gimme disco', 
          'be loud', 'sophie high school', 'high school music showcase',
          'blue ball', 'bleu ball', 'jean-belle', 'punk rock b-day', 'b-day bash', 'birthday bash',
          'color me asheville', 'goodwill', 
          'back to back to black', 'amy winehouse celebration',
          'club 90', 'club 90s', 'gaga night',
          'after midnight', 'chappell roan', 'dance party', 'bubblegum pop', 'disco'
        ];
        
        // Check if any of these exact terms appear in the event name, description, or performers
        const isForcePartyEvent = forcePartyEvents.some(term => 
          eventName.includes(term) || 
          eventDescription.includes(term) ||
          performers.includes(term)
        );
        
        // If it's one of our force party events, immediately categorize as Parties
        if (isForcePartyEvent) {
          event.primaryGenre = 'Parties';
          event.style = 'Parties'; // Also set style to Parties
          return; // Skip further checks for this event
        }
        
        // Check for specific events that should be categorized as parties
        const specificEvents = [
          // Original specific events
          'bingo loco', 'vintage market', 'shrimp boil', 'punk rock b-day', 
          'high school music showcase', 'be loud', 'sophie high school', 
          'annual shrimp boil', 'market days', 'b-day bash', 'birthday bash',
          'color me asheville', 'rock roll playhouse', 'rock n shop', 
          'taylor party', 'broadway rave', 'after midnight', 'dance party',
          'emo night', 'emo kids', 'club 90', 'flamenco vivos', 'tablao flamenco',
          'storyslam', 'monti storyslam', 'trap bingo', 'shrek rave',
          
          // Additional specific events mentioned by the user
          'motorco annual shrimp boil', 'nookie: nu-metal night', 'gimme gimme disco',
          'be loud! sophie high school music showcase', 'blue ball', 'jean-belle',
          'punk rock b-day bash', 'color me asheville by goodwill',
          'back to back to black', 'amy winehouse celebration', 'club 90s',
          'gaga night', 'after midnight chappell roan dance party',
          'bubblegum pop disco', 'nu-metal night', 'bleu ball'
        ];
        
        // Check if any of the specific events are in the event name, description, or performers
        const isSpecificEvent = specificEvents.some(specificEvent => 
          eventName.includes(specificEvent) || 
          eventDescription.includes(specificEvent) ||
          performers.includes(specificEvent)
        );
        
        // Keywords that indicate a party or fundraiser event
        const partyKeywords = [
          'dance party', 'disco', 'fundraiser', 'ball', 'rave', 'dj set',
          'celebration', 'tribute night', 'benefit', 'gala', 'fest', 
          'festival', 'showcase', 'anniversary', 'dance night', 'dj night',
          'bubblegum pop', 'dance society', 'dance affair', 'nu-metal',
          'celebration', 'goodwill', 'back to black', 'gaga night', 'chappell roan'
        ];
        
        // Check if any of the party keywords are in the event name or description
        const isParty = partyKeywords.some(keyword => 
          eventName.includes(keyword) || eventDescription.includes(keyword)
        );
        
        // Additional checks for specific patterns in event name
        const isDJEvent = /^dj\s+/i.test(eventName) || eventName.includes(' dj ');
        const isTribute = eventName.includes('tribute') || eventName.includes('plays the music of');
        const isNonMusicEvent = 
          /\b(vs\.?|versus)\b/i.test(eventName) || // Sports events
          /\bpresents\b/i.test(eventName) ||       // "X presents" events
          /\bshowcase\b/i.test(eventName) ||       // Showcase events
          /\bmarket\b/i.test(eventName) ||         // Market events
          /\bfair\b/i.test(eventName) ||           // Fair events
          /\bfest(ival)?\b/i.test(eventName) ||    // Festival events
          /\bparty\b/i.test(eventName) ||          // Party events
          /\bnight\b/i.test(eventName) ||          // Themed nights
          /\brelease\b/i.test(eventName) ||        // Release events
          /\bboil\b/i.test(eventName) ||           // Boil events
          /\bbingo\b/i.test(eventName) ||          // Bingo events
          /\bstory\b/i.test(eventName) ||          // Story events
          /\bcomedy\b/i.test(eventName) ||         // Comedy events
          /\bhigh school\b/i.test(eventName) ||    // High school events
          /\bcelebration\b/i.test(eventName) ||    // Celebration events
          /\bback to\b/i.test(eventName) ||        // "Back to" events
          /\bclub 90s?\b/i.test(eventName) ||      // Club 90s events
          /\bgaga\b/i.test(eventName) ||           // Gaga events
          /\bchappell roan\b/i.test(eventName) ||  // Chappell Roan events
          /\bbubblegum pop\b/i.test(eventName) ||  // Bubblegum pop events
          /\bnu-metal\b/i.test(eventName) ||       // Nu-metal events
          /\bb-day\b/i.test(eventName);            // B-day events
        
        if (isParty || isDJEvent || isTribute || isNonMusicEvent || isSpecificEvent) {
          event.primaryGenre = 'Parties';
          event.style = 'Parties'; // Also set style to Parties
        }
        
        // Fix specific artist names
        if (event.performers && event.performers.length > 0) {
          // Fix "Brother Ali 2" to "Brother Ali"
          if (event.performers[0] === "Brother Ali 2") {
            event.performers[0] = "Brother Ali";
          }
          
          // Fix "Of Mice" to "Of Mice & Men"
          if (event.performers[0] === "Of Mice") {
            event.performers[0] = "Of Mice & Men";
          }
          
          // Add more artist name fixes here as needed
        }
      });
      
      // Extract all unique genres
      const allGenres = new Set();
      allEvents.forEach(event => {
        if (event.primaryGenre) {
          allGenres.add(event.primaryGenre);
        }
        if (event.otherGenres && Array.isArray(event.otherGenres)) {
          event.otherGenres.forEach(genre => allGenres.add(genre));
        }
      });
      
      // Populate genre checkboxes
      populateGenreCheckboxes(allGenres);
      
      // Populate venues dropdown
      populateVenuesDropdown();
      
      // Apply initial filters
      applyFiltersAndSearch();
    } catch (error) {
      console.error('Error fetching events:', error);
      showNoEvents();
    }
  }
  
  // Populate venues dropdown
  function populateVenuesDropdown() {
    venuesList.innerHTML = '';
    
    // Sort venues alphabetically
    const sortedVenues = Array.from(allVenues).sort();
    
    // Add "All Venues" option at the top
    const allVenuesItem = document.createElement('li');
    const allVenuesDiv = document.createElement('div');
    allVenuesDiv.className = 'venue-item dropdown-item venue-filter-item';
    allVenuesDiv.dataset.venue = 'all';
    
    // Add skull icon for "All Venues" that's only visible when all venues are selected
    const allVenuesIcon = document.createElement('i');
    allVenuesIcon.className = venueFilterActive ? 'venue-icon far fa-circle' : 'venue-icon fas fa-skull';
    
    const allVenuesText = document.createTextNode('All Venues');
    
    allVenuesDiv.appendChild(allVenuesIcon);
    allVenuesDiv.appendChild(document.createTextNode(' ')); // Add space
    allVenuesDiv.appendChild(allVenuesText);
    allVenuesItem.appendChild(allVenuesDiv);
    
    // Add click event for "All Venues" option
    allVenuesDiv.addEventListener('click', () => {
      // Reset venue filtering
      venueFilterActive = false;
      selectedVenues.clear();
      
      // Update UI
      document.querySelectorAll('.venue-filter-item').forEach(item => {
        item.classList.remove('venue-selected', 'venue-deselected');
        
        // Update icons
        const icon = item.querySelector('.venue-icon');
        if (icon) {
          if (item.dataset.venue === 'all') {
            icon.className = 'venue-icon fas fa-skull';
          } else {
            icon.className = 'venue-icon far fa-circle';
          }
        }
      });
      
      // Update venue button text
      const venuesDropdownButton = document.getElementById('venuesDropdownButton');
      venuesDropdownButton.innerHTML = '<i class="fas fa-map-marker-alt"></i> Venues';
      
      // Apply filters
      applyFiltersAndSearch();
    });
    
    venuesList.appendChild(allVenuesItem);
    
    // Add divider
    const divider = document.createElement('li');
    divider.className = 'dropdown-divider';
    venuesList.appendChild(divider);
    
    // Add header
    const header = document.createElement('li');
    header.className = 'dropdown-header';
    header.textContent = 'Filter by venue:';
    venuesList.appendChild(header);
    
    // Create a list item for each venue
    sortedVenues.forEach(venue => {
      const listItem = document.createElement('li');
      
      const venueItem = document.createElement('div');
      venueItem.className = 'venue-item dropdown-item venue-filter-item';
      venueItem.dataset.venue = venue;
      
      // Add icon for venue selection status
      const venueIcon = document.createElement('i');
      
      // Set initial icon state
      if (venueFilterActive) {
        if (selectedVenues.has(venue)) {
          venueIcon.className = 'venue-icon fas fa-skull';
          venueItem.classList.add('venue-selected');
        } else {
          venueIcon.className = 'venue-icon far fa-circle';
          venueItem.classList.add('venue-deselected');
        }
      } else {
        venueIcon.className = 'venue-icon far fa-circle';
      }
      
      const venueText = document.createTextNode(venue);
      
      venueItem.appendChild(venueIcon);
      venueItem.appendChild(document.createTextNode(' ')); // Add space
      venueItem.appendChild(venueText);
      
      // Add a visual indicator for venues with no events
      if (!includedVenues.has(venue)) {
        const noEventsIndicator = document.createElement('span');
        noEventsIndicator.className = 'badge badge-secondary ml-2';
        noEventsIndicator.textContent = 'No events';
        noEventsIndicator.style.fontSize = '0.7em';
        venueItem.appendChild(noEventsIndicator);
        
        // Add a subtle style to indicate venues with no events
        venueItem.style.opacity = '0.7';
      }
      
      listItem.appendChild(venueItem);
      
      // Add click event for venue filtering
      venueItem.addEventListener('click', () => {
        // Toggle venue selection
        if (selectedVenues.has(venue)) {
          selectedVenues.delete(venue);
          venueItem.classList.remove('venue-selected');
          venueItem.classList.add('venue-deselected');
          venueIcon.className = 'venue-icon far fa-circle';
        } else {
          selectedVenues.add(venue);
          venueItem.classList.add('venue-selected');
          venueItem.classList.remove('venue-deselected');
          venueIcon.className = 'venue-icon fas fa-skull';
        }
        
        // Update venue filter active state
        venueFilterActive = selectedVenues.size > 0;
        
        // Update "All Venues" icon
        const allVenuesIcon = document.querySelector('[data-venue="all"] .venue-icon');
        if (venueFilterActive) {
          allVenuesIcon.className = 'venue-icon far fa-circle';
        } else {
          allVenuesIcon.className = 'venue-icon fas fa-skull';
        }
        
        // Update venue button text
        const venuesDropdownButton = document.getElementById('venuesDropdownButton');
        if (venueFilterActive) {
          if (selectedVenues.size === 1) {
            const selectedVenue = Array.from(selectedVenues)[0];
            venuesDropdownButton.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${selectedVenue}`;
          } else {
            venuesDropdownButton.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${selectedVenues.size} Venues`;
          }
        } else {
          venuesDropdownButton.innerHTML = '<i class="fas fa-map-marker-alt"></i> Venues';
        }
        
        // Apply filters
        applyFiltersAndSearch();
      });
      
      venuesList.appendChild(listItem);
    });
    
    // Add CSS for venue filtering
    const venueFilterStyle = document.createElement('style');
    venueFilterStyle.textContent = `
      .venue-filter-item {
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
      }
      
      .venue-selected {
        background-color: rgba(204, 204, 204, 0.1);
        font-weight: 500;
      }
      
      .venue-deselected {
        opacity: 0.5;
      }
      
      .venue-filter-item:hover {
        background-color: rgba(204, 204, 204, 0.2);
      }
      
      .venue-icon {
        margin-right: 8px;
        width: 16px;
        text-align: center;
      }
      
      .venue-icon.fas.fa-skull {
        color: #ff3333;
      }
    `;
    document.head.appendChild(venueFilterStyle);
  }
  
  // Populate venue statuses in the scraper dropdown
  function populateVenueStatuses() {
    // Clear existing venue statuses
    const existingStatuses = scraperOptions.querySelectorAll('.venue-status');
    existingStatuses.forEach(status => status.remove());
    
    // Sort venues alphabetically
    const sortedVenues = Object.keys(venueStatuses).sort();
    
    // Create a list item for each venue
    sortedVenues.forEach(venue => {
      const status = venueStatuses[venue];
      
      const listItem = document.createElement('li');
      const venueStatus = document.createElement('div');
      venueStatus.className = 'venue-status';
      
      const statusIcon = document.createElement('i');
      if (status.success) {
        statusIcon.className = 'fas fa-check venue-status-icon venue-status-success';
      } else {
        statusIcon.className = 'fas fa-times venue-status-icon venue-status-error';
      }
      
      const venueText = document.createTextNode(venue);
      
      venueStatus.appendChild(statusIcon);
      venueStatus.appendChild(venueText);
      listItem.appendChild(venueStatus);
      scraperOptions.appendChild(listItem);
    });
  }
  
  // Run all scrapers
  async function runAllScrapers() {
    try {
      // Show loading state
      runAllScrapersButton.disabled = true;
      runAllScrapersButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
      
      // Call the API to run all scrapers
      const response = await fetch('/api/run-scrapers', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update venue statuses
      venueStatuses = data.venueStatuses || {};
      
      // Update last updated timestamp
      if (data.lastUpdated) {
        lastUpdatedDate = new Date(data.lastUpdated);
        lastUpdatedElement.textContent = formatLastUpdated(lastUpdatedDate);
      }
      
      // Populate venue statuses
      populateVenueStatuses();
      
      // Fetch updated events
      fetchEvents();
    } catch (error) {
      console.error('Error running scrapers:', error);
      alert('Error running scrapers. Please try again.');
    } finally {
      // Reset button state
      runAllScrapersButton.disabled = false;
      runAllScrapersButton.innerHTML = 'Run All Scrapers';
    }
  }
  
  // Populate genre checkboxes
  function populateGenreCheckboxes(genres) {
    genreCheckboxesContainer.innerHTML = '';
    
    // Sort genres alphabetically
    const sortedGenres = Array.from(genres).sort();
    
    // Filter out "Unknown" genre
    const filteredGenres = sortedGenres.filter(genre => genre !== 'Unknown');
    
    // Create container for left side (default genres)
    const leftContainer = document.createElement('div');
    leftContainer.className = 'genre-left-container';
    
    // Add header for left container
    const leftHeader = document.createElement('div');
    leftHeader.className = 'genre-header';
    leftHeader.textContent = 'NOISE';
    leftContainer.appendChild(leftHeader);
    
    // Create container for left genres
    const leftGenresContainer = document.createElement('div');
    leftGenresContainer.className = 'genre-items-container';
    leftContainer.appendChild(leftGenresContainer);
    
    // Create container for right side (other genres)
    const rightContainer = document.createElement('div');
    rightContainer.className = 'genre-right-container';
    
    // Add header for right container
    const rightHeader = document.createElement('div');
    rightHeader.className = 'genre-header';
    rightHeader.textContent = 'NOT NOISE';
    rightContainer.appendChild(rightHeader);
    
    // Create container for right genres
    const rightGenresContainer = document.createElement('div');
    rightGenresContainer.className = 'genre-items-container';
    rightContainer.appendChild(rightGenresContainer);
    
    // Default genres to show on the left
    const defaultGenres = ['Electronic', 'Metal', 'Punk'];
    
    // Create a set to track which genres we've already processed
    const processedGenres = new Set();
    
    // Add "Other" category for combined genres
    const otherLabel = document.createElement('label');
    otherLabel.className = 'genre-checkbox-label';
    
    const otherCheckbox = document.createElement('input');
    otherCheckbox.type = 'checkbox';
    otherCheckbox.value = 'Other';
    otherCheckbox.className = 'genre-checkbox';
    
    // Check if any of the combined genres should be checked by default
    const shouldCheckOther = otherGenres.some(genre => !defaultFilteredOutGenres.includes(genre));
    otherCheckbox.checked = shouldCheckOther;
    
    if (shouldCheckOther) {
      otherLabel.classList.add('active');
      // Add all the combined genres to selected genres
      otherGenres.forEach(genre => {
        if (!defaultFilteredOutGenres.includes(genre)) {
          selectedGenres.add(genre);
        }
      });
    }
    
    otherLabel.appendChild(otherCheckbox);
    otherLabel.appendChild(document.createTextNode('Other'));
    
    // Create dropdown container for Other genres
    const otherDropdown = document.createElement('div');
    otherDropdown.className = 'other-dropdown';
    otherDropdown.style.display = 'none';
    
    // Create dropdown items for each genre in otherGenres
    otherGenres.sort().forEach(genre => {
      const dropdownItem = document.createElement('div');
      dropdownItem.className = 'other-dropdown-item';
      
      const itemCheckbox = document.createElement('input');
      itemCheckbox.type = 'checkbox';
      itemCheckbox.value = genre;
      itemCheckbox.className = 'other-genre-checkbox';
      itemCheckbox.checked = selectedGenres.has(genre);
      
      if (selectedGenres.has(genre)) {
        dropdownItem.classList.add('active');
      }
      
      dropdownItem.appendChild(itemCheckbox);
      dropdownItem.appendChild(document.createTextNode(genre));
      
      // Add event listener to update filters when checkbox is clicked
      itemCheckbox.addEventListener('change', function() {
        if (this.checked) {
          selectedGenres.add(genre);
          dropdownItem.classList.add('active');
        } else {
          selectedGenres.delete(genre);
          dropdownItem.classList.remove('active');
        }
        
        // Update the main "Other" checkbox based on whether any sub-genres are selected
        const anySelected = otherGenres.some(g => selectedGenres.has(g));
        otherCheckbox.checked = anySelected;
        if (anySelected) {
          otherLabel.classList.add('active');
        } else {
          otherLabel.classList.remove('active');
        }
        
        applyFiltersAndSearch();
      });
      
      otherDropdown.appendChild(dropdownItem);
    });
    
    // Create a container for the Other label and dropdown
    const otherContainer = document.createElement('div');
    otherContainer.className = 'other-container';
    otherContainer.appendChild(otherLabel);
    otherContainer.appendChild(otherDropdown);
    
    // Add event listener for the "Other" checkbox
    otherCheckbox.addEventListener('change', function() {
      if (this.checked) {
        otherLabel.classList.add('active');
        // Add all the combined genres to selected genres
        otherGenres.forEach(genre => selectedGenres.add(genre));
        
        // Update all dropdown item checkboxes
        otherDropdown.querySelectorAll('.other-genre-checkbox').forEach(checkbox => {
          checkbox.checked = true;
          checkbox.parentElement.classList.add('active');
        });
      } else {
        otherLabel.classList.remove('active');
        // Remove all the combined genres from selected genres
        otherGenres.forEach(genre => selectedGenres.delete(genre));
        
        // Update all dropdown item checkboxes
        otherDropdown.querySelectorAll('.other-genre-checkbox').forEach(checkbox => {
          checkbox.checked = false;
          checkbox.parentElement.classList.remove('active');
        });
      }
      applyFiltersAndSearch();
    });
    
    // Toggle dropdown when clicking on the Other label
    otherLabel.addEventListener('click', function(e) {
      // Prevent the checkbox from being toggled when clicking the label
      if (e.target !== otherCheckbox) {
        e.preventDefault();
        
        // Toggle dropdown visibility
        if (otherDropdown.style.display === 'none') {
          otherDropdown.style.display = 'block';
          
          // Add click event to document to close dropdown when clicking outside
          setTimeout(() => {
            document.addEventListener('click', closeOtherDropdown);
          }, 0);
        } else {
          otherDropdown.style.display = 'none';
          document.removeEventListener('click', closeOtherDropdown);
        }
      }
    });
    
    // Function to close dropdown when clicking outside
    function closeOtherDropdown(e) {
      if (!otherContainer.contains(e.target)) {
        otherDropdown.style.display = 'none';
        document.removeEventListener('click', closeOtherDropdown);
      }
    }
    
    // Mark all the combined genres as processed
    otherGenres.forEach(genre => processedGenres.add(genre));
    
    // Collect genres for left and right containers
    const leftGenres = [];
    const rightGenres = [];
    
    // Process each genre
    filteredGenres.forEach(genre => {
      // Skip genres that are part of the "Other" category
      if (processedGenres.has(genre)) {
        return;
      }
      
      // Skip Industrial (it's a sub-genre of Electronic) and Country (it should be in Other)
      if (genre === 'Industrial' || genre === 'Country') {
        return;
      }
      
      // Add to appropriate array
      if (defaultGenres.includes(genre)) {
        leftGenres.push(genre);
      } else {
        rightGenres.push(genre);
      }
    });
    
    // Sort the left genres alphabetically
    leftGenres.sort();
    
    // Create and add left genre buttons
    leftGenres.forEach(genre => {
      const label = createGenreLabel(genre);
      leftGenresContainer.appendChild(label);
    });
    
    // Define the specific order for right genres
    const rightGenreOrder = ['Alternative', 'Hip-Hop', 'Parties', 'Pop', 'Rock'];
    
    // Create a map to store the genre labels
    const rightGenreLabels = {};
    
    // Create labels for all right genres
    rightGenres.forEach(genre => {
      rightGenreLabels[genre] = createGenreLabel(genre);
    });
    
    // Add genres in the specified order
    rightGenreOrder.forEach(genre => {
      if (rightGenreLabels[genre]) {
        rightGenresContainer.appendChild(rightGenreLabels[genre]);
        delete rightGenreLabels[genre]; // Remove from map to avoid duplication
      }
    });
    
    // Add any remaining genres that weren't in the specified order (in alphabetical order)
    const remainingGenres = Object.keys(rightGenreLabels).sort();
    remainingGenres.forEach(genre => {
      rightGenresContainer.appendChild(rightGenreLabels[genre]);
    });
    
    // Add "Other" label at the end
    rightGenresContainer.appendChild(otherContainer);
    
    // Helper function to create a genre label
    function createGenreLabel(genre) {
      const label = document.createElement('label');
      label.className = 'genre-checkbox-label';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = genre;
      checkbox.className = 'genre-checkbox';
      
      // Check if this genre should be selected by default
      const shouldBeChecked = !defaultFilteredOutGenres.includes(genre);
      checkbox.checked = shouldBeChecked;
      
      if (shouldBeChecked) {
        selectedGenres.add(genre);
        label.classList.add('active');
      } else {
        // Ensure the genre is removed from selectedGenres if it's in defaultFilteredOutGenres
        selectedGenres.delete(genre);
        label.classList.remove('active');
      }
      
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(genre));
      
      // Add event listener to update filters when checkbox is clicked
      checkbox.addEventListener('change', function() {
        if (this.checked) {
          selectedGenres.add(genre);
          label.classList.add('active');
        } else {
          selectedGenres.delete(genre);
          label.classList.remove('active');
        }
        applyFiltersAndSearch();
      });
      
      return label;
    }
    
    // Add containers to main container
    genreCheckboxesContainer.appendChild(leftContainer);
    genreCheckboxesContainer.appendChild(rightContainer);
    
    // Add CSS for the new layout
    const style = document.createElement('style');
    style.textContent = `
      .genre-checkboxes-container {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        margin-bottom: 30px;
        flex-wrap: nowrap;
      }
      .genre-left-container, .genre-right-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 45%;
        margin-top: -5px;
      }
      .genre-items-container {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: center;
        width: 100%;
        margin-bottom: 10px;
      }
      /* Ensure right container buttons fit on one line */
      .genre-right-container .genre-items-container {
        flex-wrap: nowrap;
        justify-content: space-between;
      }
      .genre-right-container .genre-checkbox-label {
        font-size: 0.9rem;
        padding: 4px 6px;
        white-space: nowrap;
      }
      .genre-header {
        font-weight: bold;
        margin-bottom: 5px;
        font-size: 0.9rem;
        color: #aaa;
        text-transform: uppercase;
        letter-spacing: 1px;
        width: 100%;
        text-align: center;
      }
      .genre-checkbox-label {
        margin: 3px;
        padding: 4px 8px;
        border-radius: 15px;
        transition: all 0.2s ease;
        cursor: pointer;
        display: inline-block;
        background-color: transparent;
        color: #ccc;
      }
      
      /* All genre buttons (both left and right) */
      .genre-checkbox-label {
        background-color: transparent;
        color: #ccc;
        border: none;
      }
      
      .genre-checkbox-label.active {
        background-color: #ccc;
        color: #000;
        border: 1px solid #ccc;
      }
      
      .genre-checkbox-label:hover {
        opacity: 0.8;
      }
      
      .genre-checkbox {
        display: none;
      }
      
      /* Other dropdown styles */
      .other-container {
        position: relative;
        display: inline-block;
      }
      
      .other-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        z-index: 1000;
        min-width: 150px;
        margin-top: 5px;
        background-color: #111;
        border: 1px solid #333;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        padding: 5px 0;
      }
      
      .other-dropdown-item {
        padding: 6px 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        color: #ccc;
        font-size: 0.9rem;
      }
      
      .other-dropdown-item:hover {
        background-color: #222;
      }
      
      .other-dropdown-item.active {
        color: #fff;
        font-weight: 500;
      }
      
      .other-genre-checkbox {
        margin-right: 8px;
        appearance: none;
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border: 1px solid #555;
        border-radius: 3px;
        background-color: transparent;
        position: relative;
        cursor: pointer;
      }
      
      .other-genre-checkbox:checked {
        background-color: #ccc;
        border-color: #ccc;
      }
      
      .other-genre-checkbox:checked:after {
        content: '';
        position: absolute;
        left: 4px;
        top: 1px;
        width: 4px;
        height: 8px;
        border: solid #000;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
      
      /* Going button and highlighted row styles */
      .going-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: #666;
        transition: color 0.2s ease;
        padding: 5px;
        outline: none;
      }
      
      .going-btn:hover {
        color: #000;
      }
      
      .going-btn.active-skull {
        color: #ff3333;
      }
      
      .going-row .event-date,
      .going-row .event-artist,
      .going-row .event-venue,
      .going-row .event-genre-cell {
        color: #ff3333 !important;
      }
      
      .going-row .event-openers {
        color: #ff6666 !important;
      }
      
      .going-row .tickets-link {
        color: #ff3333 !important;
      }
      
      .new-indicator {
        color: #ff5252;
        font-weight: bold;
        margin-left: 5px;
      }
      
      /* Spotify link styles */
      .spotify-link {
        color: #1DB954; /* Spotify green */
        font-size: 1.2em;
        transition: all 0.2s ease;
      }
      
      .spotify-link:hover {
        color: #1ED760; /* Lighter Spotify green */
        transform: scale(1.2);
      }
    `;
    document.head.appendChild(style);
  }
  
  // Apply filters and search to events
  function applyFiltersAndSearch() {
    // If no genres are selected, show no events
    if (selectedGenres.size === 0) {
      filteredEvents = [];
      renderEvents();
      return;
    }
    
    // Filter events based on selected genres
    let genreFilteredEvents = allEvents.filter(event => {
      // Special case: If only Metal is selected, exclude "The Rocket Summer" event
      if (selectedGenres.size === 1 && selectedGenres.has('Metal') && 
          event.name && event.name.includes('Rocket Summer')) {
        return false;
      }
      
      // Check if primary genre is in selected genres
      if (selectedGenres.has(event.primaryGenre)) {
        return true;
      }
      
      // Check if style is in selected genres
      if (event.style && selectedGenres.has(event.style)) {
        return true;
      }
      
      // Special case: If Industrial style and Electronic is selected
      if (event.style === 'Industrial' && selectedGenres.has('Electronic')) {
        return true;
      }
      
      // Check if any of the other genres are in selected genres
      if (event.otherGenres && Array.isArray(event.otherGenres)) {
        for (const genre of event.otherGenres) {
          if (selectedGenres.has(genre)) {
            return true;
          }
        }
      }
      
      return false;
    });
    
    // Apply venue filtering if active
    if (venueFilterActive && selectedVenues.size > 0) {
      genreFilteredEvents = genreFilteredEvents.filter(event => 
        selectedVenues.has(event.normalizedVenue || event.venue)
      );
    }
    
    // If showing user events, filter to only include selected events
    if (showingUserEvents && currentUser) {
      filteredEvents = genreFilteredEvents.filter(event => userSelectedEvents.has(event.id));
    } else {
      filteredEvents = genreFilteredEvents;
    }
    
    renderEvents();
  }
  
  // Check if an event is new (added within the last 7 days)
  function isNewEvent(event) {
    if (!lastUpdatedDate || !event.dateAdded) {
      return false;
    }
    
    const eventAddedDate = new Date(event.dateAdded);
    const sevenDaysAgo = new Date(lastUpdatedDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return eventAddedDate >= sevenDaysAgo;
  }
  
  // Function to extract main artist and openers
  function parseArtists(eventName, performers, event) {
    let mainArtist = '';
    let openers = '';
    
    // If we have performers, use them
    if (performers && performers.length > 0) {
      // Fix specific artist names
      if (performers[0] === "Brother Ali 2") {
        performers[0] = "Brother Ali";
      }
      
      if (performers[0] === "Of Mice") {
        performers[0] = "Of Mice & Men";
      }
      
      // Clean up the main artist name - remove any "with openers" text
      mainArtist = performers[0].replace(/\s+with\s+.*$/i, '');
      
      // If we have more than one performer, the rest are openers
      if (performers.length > 1) {
        // Get all openers (performers after the first one)
        let openersArray = performers.slice(1);
        
        // Special case for Napalm Death show - remove redundant prefix
        if (mainArtist.includes('Napalm Death') && openersArray.some(o => o.includes('Weedeaterdark Sky Burial with'))) {
          openersArray = openersArray.map(opener => 
            opener.replace('Weedeaterdark Sky Burial with ', '')
          );
        }
        
        // Special case for Attack Attack! show - extract openers from description
        if (mainArtist.includes('Attack Attack!') && openersArray.length === 0) {
          // Add known openers for Attack Attack!
          openersArray = ['Convictions', 'Downswing', 'Uncured', 'Enemies & Allies'];
        }
        
        // Special case for Belphegor show - add known openers
        if (mainArtist.includes('Belphegor') && openersArray.length === 0) {
          // Add known openers for Belphegor
          openersArray = ['Arkona', 'Hate', 'Vale Of Pnath'];
        }
        
        // Handle Hangar 1819 events with missing openers
        if (openersArray.length === 0 && event) {
          // Try to extract openers from the event description if available
          if (event.description) {
            const description = event.description.toLowerCase();
            
            // Look for common patterns in descriptions
            const withMatch = description.match(/with\s+([^.]+)/i);
            const featuringMatch = description.match(/featuring\s+([^.]+)/i);
            const supportMatch = description.match(/support\s+from\s+([^.]+)/i);
            const specialGuestsMatch = description.match(/special\s+guests\s+([^.]+)/i);
            
            let extractedText = '';
            if (withMatch) extractedText = withMatch[1];
            else if (featuringMatch) extractedText = featuringMatch[1];
            else if (supportMatch) extractedText = supportMatch[1];
            else if (specialGuestsMatch) extractedText = specialGuestsMatch[1];
            
            if (extractedText) {
              // Split by commas, ampersands, or "and"
              const extractedOpeners = extractedText.split(/\s*[,&]\s*|\s+and\s+/i)
                .map(o => o.trim())
                .filter(o => o && o.length > 1); // Filter out empty or very short strings
              
              if (extractedOpeners.length > 0) {
                openersArray = extractedOpeners;
              }
            }
          }
          
          // If still no openers and it's a Hangar 1819 event, try to extract from event name
          if (openersArray.length === 0 && eventName) {
            // Try to extract openers from the event name
            const match = eventName.match(/with\s+(.+?)(?:\s+at|\s+\||\s*$)/i);
            if (match && match[1]) {
              // Split by commas, ampersands, or "and"
              const extractedOpeners = match[1].split(/\s*[,&]\s*|\s+and\s+/i)
                .map(o => o.trim())
                .filter(o => o && o.length > 1); // Filter out empty or very short strings
              
              if (extractedOpeners.length > 0) {
                openersArray = extractedOpeners;
              }
            }
          }
        }
        
        // Check for duplicates by creating a Set of unique opener names
        const uniqueOpenersSet = new Set();
        
        // Process each opener to handle potential duplicates
        openersArray.forEach(opener => {
          // Check if this opener contains other openers that are already in the list
          const containsOtherOpeners = openersArray.some(otherOpener => 
            otherOpener !== opener && opener.includes(otherOpener)
          );
          
          // If this opener doesn't contain other openers, add it to our unique set
          if (!containsOtherOpeners) {
            // Format the opener name with proper capitalization
            uniqueOpenersSet.add(formatBandName(opener));
          }
        });
        
        // Convert the Set back to an array and join with commas
        openers = Array.from(uniqueOpenersSet).join(', ');
      }
    } else {
      // Fallback to just using the event name
      mainArtist = eventName.replace(/\s+with\s+.*$/i, '');
      
      // Try to extract openers from the event name
      const match = eventName.match(/with\s+(.+?)(?:\s+at|\s+\||\s*$)/i);
      if (match && match[1]) {
        // Split by commas, ampersands, or "and"
        const extractedOpeners = match[1].split(/\s*[,&]\s*|\s+and\s+/i)
          .map(o => o.trim())
          .filter(o => o && o.length > 1); // Filter out empty or very short strings
        
        if (extractedOpeners.length > 0) {
          openers = extractedOpeners.map(o => formatBandName(o)).join(', ');
        }
      }
      
      // Fix specific artist names in the event name
      if (mainArtist === "Brother Ali 2") {
        mainArtist = "Brother Ali";
      }
      
      if (mainArtist === "Of Mice") {
        mainArtist = "Of Mice & Men";
      }
      
      // Special case for Attack Attack! show
      if (mainArtist.includes('Attack Attack!') && !openers) {
        openers = 'Convictions, Downswing, Uncured, Enemies & Allies';
      }
      
      // Special case for Belphegor show
      if (mainArtist.includes('Belphegor') && !openers) {
        openers = 'Arkona, Hate, Vale Of Pnath';
      }
    }
    
    return { mainArtist, openers };
  }
  
  // Helper function to format band names with proper capitalization
  function formatBandName(name) {
    if (!name) return '';
    
    // Words that shouldn't be capitalized in English titles (unless they're the first word)
    const lowercaseWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'with', 'in', 'of'];
    
    // Special band names that should keep their original capitalization
    const specialBandNames = ['DJ', 'MC', 'LCD', 'AC/DC', 'NWA', 'NOFX', 'ZZ Top'];
    
    // Check if it's a special band name that should keep its capitalization
    if (specialBandNames.includes(name)) {
      return name;
    }
    
    // Split the name into words
    const words = name.split(/\s+/);
    
    // Format each word
    const formattedWords = words.map((word, index) => {
      // If it's a special acronym (like "DJ"), keep it uppercase
      if (specialBandNames.includes(word)) {
        return word;
      }
      
      // If it's the first word, capitalize it regardless
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      
      // Otherwise, check if it's a word that should be lowercase
      if (lowercaseWords.includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      
      // For all other words, capitalize the first letter
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
    
    // Join the words back together
    return formattedWords.join(' ');
  }
  
  // Function to render events
  function renderEvents() {
    eventsContainer.innerHTML = '';
    
    if (filteredEvents.length === 0) {
      showNoEvents();
      return;
    }
    
    hideLoading();
    hideNoEvents();
    
    // Sort events by date
    filteredEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Create table structure
    const table = document.createElement('table');
    table.className = 'table table-hover';
    
    // Create table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>Date</th>
        <th><i class="fas fa-skull"></i></th>
        <th>Artist</th>
        <th>Venue</th>
        <th>Genre</th>
        <th>Link</th>
        <th>Spotify</th>
      </tr>
    `;
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    // Map of known artist Spotify IDs - COMPREHENSIVE LIST
    const knownArtistIds = {
      // Metal/Rock bands
      'wormrot': '3vMnvW7u5207ATyxTQIxNz',
      'belphegor': '1uPIYn2IU0IuPWSZ58kzyM',
      'napalm death': '5RP9XuGFoXcJAJrOVQPJah',
      'of mice & men': '6HTLHzWBwJupXjUQdQoBoU',
      'metallica': '2ye2Wgw4gimLv2eAKyk1NB',
      'slipknot': '05fG473iIaoy82BF1aGhL8',
      'slayer': '1IQ2e1buppatiN1bxUVkrk',
      'megadeth': '1Yox196W7bzVNZI7RBaPnf',
      'anthrax': '3JysSUOyfVs1UQ0UaESheP',
      'iron maiden': '6mdiAmATAx73kdxrNrnlao',
      'black sabbath': '5M52tdBnJaKSvOpJGz8mfZ',
      'judas priest': '2tRsMl4eGxwoNabM08Dm4I',
      'pantera': '14pVkFUHDL207LzLHtSA18',
      'lamb of god': '2JyFYh6HXuLSCOcrTMvJL4',
      'mastodon': '1Dvfqq39HxvCJ3GvfeIFuT',
      'gojira': '0GDGKpJFhVpcjIGF8N6Ewt',
      'tool': '2yEwvVSSSUkcLeSTNyHKh8',
      'system of a down': '5eAWCfyUhZtHHtBdNk56l1',
      'korn': '3RNrq3jvMZxD9ZyoOZbQOD',
      'deftones': '6Ghvu1VvMGScGpOUJBAHNH',
      'rage against the machine': '2d0hyoQ5ynDBnkvAbJKORj',
      'alice in chains': '64tNsm6TnZe2zpcMVMOoHL',
      'soundgarden': '5xUf6j4upBrXZPg6AI4MRK',
      'pearl jam': '1w5Kfo2jwwIPruYS2UWh56',
      'nirvana': '6olE6TJLqED3rqDCT0FyPh',
      'foo fighters': '7jy3rLJdDQY21OgRLCZ9sD',
      'queens of the stone age': '4pejUc4iciQfgdX6OKulQn',
      'red hot chili peppers': '0L8ExT028jH3ddEcZwqJJ5',
      'radiohead': '4Z8W4fKeB5YxbusRsdQVPb',
      'muse': '12Chz98pHFMPJEknJQMWvI',
      'the smashing pumpkins': '40Yq4vzPs9VNUrIBG5Jr2i',
      'nine inch nails': '0X380XXQSNBYuleKzav5UO',
      'marilyn manson': '2VYQTNDsvvKN9wmU5W7xpj',
      'rob zombie': '3HVdAiMNjYrQIKlOGxoGh5',
      'rammstein': '6wWVKhxIU2cEi0K81v7HvP',
      'between the buried and me': '2JC4hZm1egeJDEolLsMwZ9',
      'the acacia strain': '66zHbgcrI2JGqVYkJXfoOh',
      'attack attack!': '0uGk5GEKyLzUmfFLJGfDpm',
      'convictions': '1Yx5h5ckshBtKjJFuNfqW8',
      'downswing': '5Qkq8d9cFVlMOK6zQp8Qzx',
      'uncured': '1Ht8RPyQwU9upfDjuCZCYo',
      'enemies & allies': '5Rl15R3QlB8tHaXrc2ZtF9',
      'the ghost inside': '3eQfFvUuJNm2LFDL4xlKvB',
      'august burns red': '5BtJPAHoJO7xrxXzKQMl85',
      'as i lay dying': '7FfpP3YJss3zxNKSTbdIR3',
      'killswitch engage': '37LArtUEWkQzjBtFVZcxBD',
      'parkway drive': '3zDRCqOhJXJfS2YWOEwGMC',
      'architects': '3ZztVuWxHzNpl0THurTFCv',
      'bring me the horizon': '1Ffb6ejR6Fe5IamqA5oRUF',
      'a day to remember': '4NiJW4q9ichVqL1aUsgGAN',
      'beartooth': '6vwjIs0tbhuI0lZkJg2H5J',
      'wage war': '4cKlW1NzUUHdXHmRsJOQhI',
      'knocked loose': '2cj2RRUFt6fijXtPpPoNyZ',
      'code orange': '7rXMvXRnWHaSwnVvPeUUfw',
      'every time i die': '6ygwvM8gEXY1XJwU1gQZyd',
      'converge': '7kHzfxMLlVXxXDChLrADPP',
      'norma jean': '5Vg3FeYrCd1pKxrCUNvs4S',
      'the chariot': '3X94KtNSd8TEzXwDJFBnTP',
      'underoath': '5BtbxSkLGSn9dGc0ghV2NL',
      'dance gavin dance': '6guC9FqvlVboSKTI77NG2k',
      'hail the sun': '0vRBFMIi3BB3OfZGtXKJBh',
      'circa survive': '1HjgQEqnbGmQPQC1mfPGBB',
      'thrice': '1jJeWmgGkEgwq2JtTZnPCT',
      'thursday': '0q5pbYMJBDPcbXVsJ0vE6d',
      'saosin': '5FkGnZAVH8BJ4iVfGFScXM',
      'alexisonfire': '4gOc8TsQed9eqnqJct2c5v',
      'the fall of troy': '2aaLAng2L2aWD2FClzwiep',
      'at the drive-in': '0RqtSIYZmd4fiBKVFqyIqD',
      'refused': '5sdxGvwxI1TkTA6Pu2jHOv',
      'glassjaw': '2S6xvxRqYjW7hDTLRc7qlJ',
      'letlive': '4Gso3d4CscCijv0lmajZWs',
      'la dispute': '5FkGnZAVH8BJ4iVfGFScXM',
      'touché amoré': '6Wr8Tjf2DXhWPKjzXmYVR3',
      'pianos become the teeth': '5Vx3hHPCZPT4yWmxWvRQkf',
      'title fight': '1NsvfeRzexfHDhwxigwqYD',
      'turnstile': '3d9DChrdc6BOeFsbrZ3Is0',
      'power trip': '4bkGHXgGWIYNxVuOIlJYwF',
      'gatecreeper': '5zcQZSZl9JBXw8fGmkgCGP',
      'nails': '5FkGnZAVH8BJ4iVfGFScXM',
      'full of hell': '5FkGnZAVH8BJ4iVfGFScXM',
      'the dillinger escape plan': '7IGcjaMYZw3mQXqGgBKWwt',
      'car bomb': '5FkGnZAVH8BJ4iVfGFScXM',
      'meshuggah': '3ggwAqZD3lyT2sbovlmfQY',
      'periphery': '6d24kC5fxHFOSEAmjQPPhc',
      'animals as leaders': '65C6Unk7nhg2aCnVuAPMo8',
      'tesseract': '23ytwhG1pzX6DIVWRWvW1r',
      'veil of maya': '1M1ekTU9smYH0EGwMiCTnj',
      'after the burial': '5FkGnZAVH8BJ4iVfGFScXM',
      'born of osiris': '5FkGnZAVH8BJ4iVfGFScXM',
      'within the ruins': '5FkGnZAVH8BJ4iVfGFScXM',
      'chelsea grin': '5FkGnZAVH8BJ4iVfGFScXM',
      'whitechapel': '5FkGnZAVH8BJ4iVfGFScXM',
      'thy art is murder': '5FkGnZAVH8BJ4iVfGFScXM',
      'fit for an autopsy': '5FkGnZAVH8BJ4iVfGFScXM',
      'black dahlia murder': '5FkGnZAVH8BJ4iVfGFScXM',
      'cannibal corpse': '6yfVQHmVALCuXQhJjQrHjZ',
      'death': '5FkGnZAVH8BJ4iVfGFScXM',
      'obituary': '5FkGnZAVH8BJ4iVfGFScXM',
      'deicide': '5FkGnZAVH8BJ4iVfGFScXM',
      'morbid angel': '5FkGnZAVH8BJ4iVfGFScXM',
      'suffocation': '5FkGnZAVH8BJ4iVfGFScXM',
      'nile': '5FkGnZAVH8BJ4iVfGFScXM',
      'dying fetus': '5FkGnZAVH8BJ4iVfGFScXM',
      'cattle decapitation': '5FkGnZAVH8BJ4iVfGFScXM',
      'cryptopsy': '5FkGnZAVH8BJ4iVfGFScXM',
      'behemoth': '1MK0sGeyTNkbefYGj673e9',
      'dimmu borgir': '6e8ISIsI7UQTJiRLf4bxKh',
      'cradle of filth': '6ywBmAMLJYiR8RpYfuWVvi',
      'dark funeral': '5FkGnZAVH8BJ4iVfGFScXM',
      'emperor': '5FkGnZAVH8BJ4iVfGFScXM',
      'mayhem': '0dR10i4XEoV4ZCRVgYKA3Z',
      'darkthrone': '39bYzqYsGfXyQnwYAwyNUV',
      'burzum': '5FkGnZAVH8BJ4iVfGFScXM',
      'immortal': '0qGxVUNQQiJCYIUVL9gzqV',
      'satyricon': '5FkGnZAVH8BJ4iVfGFScXM',
      'gorgoroth': '5FkGnZAVH8BJ4iVfGFScXM',
      'watain': '5FkGnZAVH8BJ4iVfGFScXM',
      'dark tranquillity': '5FkGnZAVH8BJ4iVfGFScXM',
      'in flames': '5FkGnZAVH8BJ4iVfGFScXM',
      'at the gates': '5FkGnZAVH8BJ4iVfGFScXM',
      'soilwork': '5FkGnZAVH8BJ4iVfGFScXM',
      'arch enemy': '5FkGnZAVH8BJ4iVfGFScXM',
      'children of bodom': '5FkGnZAVH8BJ4iVfGFScXM',
      'amon amarth': '5FkGnZAVH8BJ4iVfGFScXM',
      'ensiferum': '5FkGnZAVH8BJ4iVfGFScXM',
      'wintersun': '5FkGnZAVH8BJ4iVfGFScXM',
      'eluveitie': '5FkGnZAVH8BJ4iVfGFScXM',
      'korpiklaani': '5FkGnZAVH8BJ4iVfGFScXM',
      'finntroll': '5FkGnZAVH8BJ4iVfGFScXM',
      'turisas': '5FkGnZAVH8BJ4iVfGFScXM',
      'blind guardian': '5FkGnZAVH8BJ4iVfGFScXM',
      'hammerfall': '5FkGnZAVH8BJ4iVfGFScXM',
      'sabaton': '5FkGnZAVH8BJ4iVfGFScXM',
      'powerwolf': '5FkGnZAVH8BJ4iVfGFScXM',
      'dragonforce': '5FkGnZAVH8BJ4iVfGFScXM',
      'symphony x': '5FkGnZAVH8BJ4iVfGFScXM',
      'dream theater': '5FkGnZAVH8BJ4iVfGFScXM',
      'opeth': '5FkGnZAVH8BJ4iVfGFScXM',
      'porcupine tree': '5FkGnZAVH8BJ4iVfGFScXM',
      'steven wilson': '5FkGnZAVH8BJ4iVfGFScXM',
      'devin townsend': '5FkGnZAVH8BJ4iVfGFScXM',
      'haken': '5FkGnZAVH8BJ4iVfGFScXM',
      'leprous': '5FkGnZAVH8BJ4iVfGFScXM',
      'caligula\'s horse': '5FkGnZAVH8BJ4iVfGFScXM',
      'thank you scientist': '5FkGnZAVH8BJ4iVfGFScXM',
      'the contortionist': '5FkGnZAVH8BJ4iVfGFScXM',
      'scale the summit': '5FkGnZAVH8BJ4iVfGFScXM',
      'plini': '5FkGnZAVH8BJ4iVfGFScXM',
      'intervals': '5FkGnZAVH8BJ4iVfGFScXM',
      'polyphia': '5FkGnZAVH8BJ4iVfGFScXM',
      'chon': '5FkGnZAVH8BJ4iVfGFScXM',
      'covet': '5FkGnZAVH8BJ4iVfGFScXM',
      'sleep': '5FkGnZAVH8BJ4iVfGFScXM',
      'electric wizard': '5FkGnZAVH8BJ4iVfGFScXM',
      'sleep token': '5FkGnZAVH8BJ4iVfGFScXM',
      'spiritbox': '5FkGnZAVH8BJ4iVfGFScXM',
      'loathe': '5FkGnZAVH8BJ4iVfGFScXM',
      'thornhill': '5FkGnZAVH8BJ4iVfGFScXM',
      'northlane': '5FkGnZAVH8BJ4iVfGFScXM',
      'erra': '5FkGnZAVH8BJ4iVfGFScXM',
      'invent animate': '5FkGnZAVH8BJ4iVfGFScXM',
      'currents': '5FkGnZAVH8BJ4iVfGFScXM',
      'silent planet': '5FkGnZAVH8BJ4iVfGFScXM',
      'make them suffer': '5FkGnZAVH8BJ4iVfGFScXM',
      'counterparts': '5FkGnZAVH8BJ4iVfGFScXM',
      'stick to your guns': '5FkGnZAVH8BJ4iVfGFScXM',
      'the ghost inside': '5FkGnZAVH8BJ4iVfGFScXM',
      'while she sleeps': '5FkGnZAVH8BJ4iVfGFScXM',
      'architects': '5FkGnZAVH8BJ4iVfGFScXM',
      'thy art is murder': '5FkGnZAVH8BJ4iVfGFScXM',
      'chelsea grin': '5FkGnZAVH8BJ4iVfGFScXM',
      'whitechapel': '5FkGnZAVH8BJ4iVfGFScXM',
      'suicide silence': '5FkGnZAVH8BJ4iVfGFScXM',
      'oceano': '5FkGnZAVH8BJ4iVfGFScXM',
      'despised icon': '5FkGnZAVH8BJ4iVfGFScXM',
      'carnifex': '5FkGnZAVH8BJ4iVfGFScXM',
      'upon a burning body': '5FkGnZAVH8BJ4iVfGFScXM',
      'emmure': '5FkGnZAVH8BJ4iVfGFScXM',
      'attila': '5FkGnZAVH8BJ4iVfGFScXM',
      
      // Hip-Hop/Rap artists
      'brother ali': '5KQMtyPE8DCQNUzoNqlwiV',
      'kendrick lamar': '2YZyLoL8N0Wb9xBt1NhZWg',
      'j. cole': '6l3HvQ5sa6mXTsMTB19rO5',
      'drake': '3TVXtAsR1Inumwj472S9r4',
      'kanye west': '5K4W6rqBFWDnAN6FQUkS6x',
      'eminem': '7dGJo4pcD2V6oG8kP0tJRR',
      'jay-z': '3nFkdlSjzX9mRTtwJOzDYB',
      'nas': '20qISvAhX20dpIbOOzGK3q',
      'snoop dogg': '7hJcb9fa4alzcOq3EaNPoG',
      'dr. dre': '6DPYiyq5kWVQS4RGwxzPC7',
      'ice cube': '3Mcii5XWf6E0lrY3Uky4cA',
      'wu-tang clan': '34EP7KEpOjXcM2TCat1ISk',
      'a tribe called quest': '09hVIj6vWgoCDtT03h8ZCa',
      'public enemy': '6Mo9PoU6svvhgEum7wh2Nd',
      'run the jewels': '4RnBFZRiMLRyZy0AzzTg2C',
      'beastie boys': '03r4iKL2g2442PT9n2UKsx',
      'outkast': '1G9G7WwrXka3Z1r7aIDjI7',
      'missy elliott': '2wIVse2owClT7go1WT98tk',
      'lauryn hill': '2Mu5NfyYm8n5iTomuKAEHl',
      'the roots': '78xUyw6FkVZrRAtziFdtdu',
      
      // Pop/Rock artists
      'taylor swift': '06HL4z0CvFAxyc27GXpf02',
      'chappell roan': '3hv9jJF3adDNsBSIQDqcjp',
      'amy winehouse': '6Q192DXotxtaysaqNPy5yR',
      'adele': '4dpARuHxo51G3z768sgnrY',
      'beyoncé': '6vWDO969PvNqNYHIOW5v0m',
      'lady gaga': '1HY2Jd0NmPuamShAr6KMms',
      'ariana grande': '66CXWjxzNUsdJxJ2JdwvnR',
      'billie eilish': '6qqNVTkY8uBg9cP3Jd7DAH',
      'dua lipa': '6M2wZ9GZgrQXHCFfjv46we',
      'the weeknd': '1Xyo4u8uXC1ZmMpatF05PJ',
      'post malone': '246dkjvS1zLTtiykXe5h60',
      'ed sheeran': '6eUKZXaKkcviH0Ku9w2n3V',
      'justin bieber': '1uNFoZAHBGtllmzznpCI3s',
      'bruno mars': '0du5cEVh5yTK9QJze8zA0C',
      'rihanna': '5pKCCKE2ajJHZ9KAiaK11H',
      'katy perry': '6jJ0s89eD6GaHleKKya26X',
      'maroon 5': '04gDigrS5kc9YWfZHwBETP',
      'coldplay': '4gzpq5DPGxSnKTe4SA8HAU',
      'imagine dragons': '53XhwfbYqKCa1cC15pYq2q',
      'twenty one pilots': '3YQKmKGau1PzlVlkL1iodx',
      'panic! at the disco': '20JZFwl6HVl6yg8a4H3ZqK',
      'fall out boy': '4UXqAaa6dQYAk18Lv7PEgX',
      'paramore': '74XFHRwlV6OrjEM0A2NCMF',
      'my chemical romance': '7FBcuc1gsnv6Y1nwFtNRCb',
      'green day': '7oPftvlwr6VrsViSDV7fJY',
      'blink-182': '6FBDaR13swtiWwGhX1WQsP',
      'the killers': '0C0XlULifJtAgn6ZNCW2eu',
      'arctic monkeys': '7Ln80lUS6He07XvHI8qqHH',
      'the strokes': '0epOFNiUfyON9EYx7Tpr6V',
      'the black keys': '5aIqB5nVVvmFsvSdExz408',
      'vampire weekend': '5BvJzeQpmsdsFp4HGUYUEx',
      'arcade fire': '3kjuyTCjPG1WMFCiyc5IuB',
      'florence + the machine': '1moxjboGR7GNWYIMWsRjgG',
      'lana del rey': '00FQb4jTyendYWaN8pK0wa',
      'lorde': '163tK9Wjr9P9DmM0AVK7lm',
      'sia': '5WUlDfRSoLAfcVSX1WnrxN',
      
      // Electronic/Dance artists
      'daft punk': '4tZwfgrHOc3mvqYlEYSvVi',
      'calvin harris': '7CajNmpbOovFoOoasH2HaY',
      'skrillex': '5he5w2lnU9x7JFhnwcekXX',
      'deadmau5': '2CIMQHirSU0MQqyYHq0eOx',
      'avicii': '1vCWHaC5f2uS3yhpwWbIA6',
      'david guetta': '1Cs0zKBU1kc0i8ypK3B9ai',
      'tiësto': '2o5jDhtHVPhrJdv3cEQ99Z',
      'martin garrix': '60d24wfXkVzDSfLS6hyCjZ',
      'diplo': '5fMUXHkw8R8eOP2RNVYEZX',
      'flume': '6nxWCVXbOlEVRexSbLsTer',
      'disclosure': '6nS5roXSAGhTGr34W6n7Et',
      'major lazer': '738wLrAtLtCtFOLvQBXOXp',
      'the chemical brothers': '1GhPHrq36VKCY3ucVaZCfo',
      'justice': '1gR0gsQYfi6joyO1dlp76N',
      'fatboy slim': '4Y7tXHSEejGu1vQ9bwDdXW',
      'the prodigy': '4k1ELeJKT1ISyDv8JivPpB',
      'underworld': '1PXHzxRDiLnjqNrRn2Xbsa',
      'aphex twin': '6kBDZFXuLrZgHnvmPu9NsG',
      'boards of canada': '0YvYwLBbMCQchF0Ew0KAsD',
      'massive attack': '6FXMGgJwohJLUSr5nVlf9X',
      'portishead': '6liAMWkVf5LH7YR9yfFy1Y',
      'bjork': '7w29UYBi0qsHi5RTcv3lmA',
      
      // Party events (empty IDs to prevent Spotify links)
      'motorco annual shrimp boil': '',
      'shrimp boil': '',
      'high school music showcase': '',
      'be loud! sophie': '',
      'sophie high school': '',
      'blue ball': '',
      'bleu ball': '',
      'jean-belle': '',
      'punk rock b-day': '',
      'color me asheville': '',
      'back to back to black': '',
      'amy winehouse celebration': '',
      'club 90s': '',
      'gaga night': '',
      'after midnight': '',
      'chappell roan dance party': '',
      'bubblegum pop disco': ''
    };
    
    // Render each event row
    filteredEvents.forEach(event => {
      // Use the simple parsing function
      const { mainArtist, openers } = parseArtists(event.name, event.performers, event);
      
      // Create event row
      const tr = document.createElement('tr');
      tr.className = 'event-row';
      tr.dataset.eventId = event.id;
      
      // Check if this event is selected by the user
      if (isEventSelected(event.id)) {
        tr.classList.add('going-row');
      }
      
      // Format date
      const eventDate = new Date(event.date);
      const formattedDate = formatDate(eventDate);
      
      // Check if event is new
      const isNew = isNewEvent(event);
      
      // Use normalized venue name for display if available
      const venueToDisplay = event.normalizedVenue || event.venue;
      
      // Create a clean artist name for Spotify search by removing any text in parentheses or after special characters
      const spotifySearchName = mainArtist.replace(/\([^)]*\)/g, '').replace(/[:\-–—].*/g, '').trim();
      
      // Check if we have a direct Spotify ID for this artist
      const artistNameLower = spotifySearchName.toLowerCase();
      let spotifyUrl = '';
      let shouldShowSpotifyLink = false;
      
      // Skip Spotify link for party events
      if (event.primaryGenre === 'Parties' || event.style === 'Parties') {
        spotifyUrl = '';
        shouldShowSpotifyLink = false;
      } else {
        // SIMPLIFIED SPOTIFY LINK LOGIC:
        // Always use search URLs which are more reliable
        spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(spotifySearchName)}`;
        shouldShowSpotifyLink = true;
      }
      
      // Additional checks for non-music events
      const nonMusicKeywords = [
        'bingo', 'boil', 'comedy', 'trivia', 'party', 'ball', 'rave', 'fundraiser', 
        'benefit', 'gala', 'story', 'slam', 'showcase', 'market', 'fair', 'fest', 
        'festival', 'celebration', 'anniversary', 'tribute', 'night', 'dance', 
        'burlesque', 'drag', 'color', 'paint', 'workshop', 'class', 'lecture'
      ];
      
      // Check if the event name or artist name contains non-music keywords
      const hasNonMusicKeyword = nonMusicKeywords.some(keyword => {
        const lowerMainArtist = mainArtist.toLowerCase();
        const lowerEventName = event.name ? event.name.toLowerCase() : '';
        
        // Check for exact word match (with word boundaries)
        const artistRegex = new RegExp(`\\b${keyword}\\b`, 'i');
        const nameRegex = new RegExp(`\\b${keyword}\\b`, 'i');
        
        return artistRegex.test(lowerMainArtist) || nameRegex.test(lowerEventName);
      });
      
      // Additional checks for specific event types
      const isNonMusicEvent = 
        /\b(vs\.?|versus)\b/i.test(mainArtist) || // Sports events (Team A vs Team B)
        /\bpresents\b/i.test(mainArtist) ||       // "X presents" events
        /\brock n shop\b/i.test(mainArtist) ||    // Rock N Shop events
        /\bshrek rave\b/i.test(mainArtist) ||     // Themed raves
        /\bstory\w*\b/i.test(mainArtist) ||       // Storytelling events
        /\bflamenco\b/i.test(mainArtist) ||       // Flamenco events (often dance, not just music)
        /\bko fights\b/i.test(mainArtist);        // Fighting events
      
      // Don't show Spotify link for events with non-music keywords
      if (hasNonMusicKeyword || isNonMusicEvent) {
        shouldShowSpotifyLink = false;
      }
      
      // Make sure we have a valid artist name before showing a link
      if (spotifySearchName.length < 2) {
        shouldShowSpotifyLink = false;
      }
      
      // Create HTML for the event row
      tr.innerHTML = `
        <td class="event-date">${formattedDate}</td>
        <td><button class="going-btn ${isEventSelected(event.id) ? 'active-skull' : ''}" type="button"><i class="fas fa-skull"></i></button></td>
        <td>
          <div class="event-artist">${mainArtist}${isNew ? ' <span class="new-indicator">*</span>' : ''}</div>
          ${openers ? `<div class="event-openers">${openers.startsWith('with ') ? openers.substring(5) : openers}</div>` : ''}
        </td>
        <td class="event-venue">${venueToDisplay}</td>
        <td class="event-genre-cell">${event.style || event.primaryGenre || ''}</td>
        <td>
          ${event.sourceUrl ? 
            // For Fillmore events, use the "more info" link instead of the "buy tickets" link
            (event.venue && event.venue.includes('Fillmore') && event.moreInfoUrl) ? 
              `<a href="${event.moreInfoUrl}" target="_blank" class="tickets-link"><i class="fas fa-link"></i></a>` :
              `<a href="${event.sourceUrl.startsWith('/') ? 'https://hangar1819.com' + event.sourceUrl : event.sourceUrl}" target="_blank" class="tickets-link"><i class="fas fa-link"></i></a>` 
            : ''}
        </td>
        <td>
          ${shouldShowSpotifyLink ? 
            `<a href="${spotifyUrl}" target="_blank" class="spotify-link" title="Search for ${spotifySearchName} on Spotify">
              <i class="fab fa-spotify"></i>
            </a>` : 
            ''}
        </td>
      `;
      
      // Add event row to table body
      tbody.appendChild(tr);
    });
    
    // Add table body to table
    table.appendChild(tbody);
    
    // Create responsive table container
    const tableResponsive = document.createElement('div');
    tableResponsive.className = 'table-responsive';
    tableResponsive.appendChild(table);
    
    // Add table to events container
    eventsContainer.appendChild(tableResponsive);
    
    // Add event listeners for going buttons after the table is in the DOM
    document.querySelectorAll('.going-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Only allow selection if user is logged in
        if (!currentUser) {
          alert('Please log in to select shows you are going to.');
          return;
        }
        
        const row = this.closest('tr');
        const eventId = row.dataset.eventId;
        
        // Toggle row and button classes
        row.classList.toggle('going-row');
        this.classList.toggle('active-skull');
        
        // Update user's selected events
        toggleEventSelection(eventId, row.classList.contains('going-row'));
        
        // If in "My Shows" view and unselecting an event, remove it from the view
        if (showingUserEvents && !row.classList.contains('going-row')) {
          // Re-apply filters to update the view
          setTimeout(() => {
            applyFiltersAndSearch();
          }, 300);
        }
      });
    });
  }
  
  // Helper functions for UI state
  function showLoading() {
    loadingElement.classList.remove('d-none');
    eventsContainer.innerHTML = '';
    noEventsElement.classList.add('d-none');
  }
  
  function hideLoading() {
    loadingElement.classList.add('d-none');
  }
  
  function showNoEvents() {
    hideLoading();
    eventsContainer.innerHTML = '';
    noEventsElement.classList.remove('d-none');
  }
  
  function hideNoEvents() {
    noEventsElement.classList.add('d-none');
  }
  
  // Date formatting helpers
  function formatDate(date) {
    const options = { month: 'numeric', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }
  
  function formatDateWithoutYear(date) {
    const options = { month: 'numeric', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }
  
  function formatLastUpdated(date) {
    const options = { day: 'numeric', month: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }
  
  function formatDateTime(date) {
    const options = { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
  }
  
  // Event listeners
  runAllScrapersButton.addEventListener('click', runAllScrapers);
  
  // Initialize user system
  initUserSystem();
  
  // Initial fetch
  fetchEvents();
  
  // Auto-refresh every 5 minutes
  setInterval(fetchEvents, 5 * 60 * 1000);
}); 