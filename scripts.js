// Global variables
let allPublications = [];
let showingSelected = true;
let modalGallery = [];
let modalGalleryIndex = 0;
let modalGalleryAlt = '';
let modalReturnFocus = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
  // Load publications data only on pages that show publications
  const hasPublicationsArea = !!document.getElementById('publications-container') || !!document.getElementById('toggle-publications');
  if (hasPublicationsArea) {
    loadPublications();
  }
  
  // Initialize animation delays for sections
  const sections = document.querySelectorAll('section');
  sections.forEach((section, index) => {
    section.style.animationDelay = `${index * 0.1}s`;
  });
  
  // Add event listener for toggle button
  const toggleButton = document.getElementById('toggle-publications');
  if (toggleButton) {
    toggleButton.addEventListener('click', togglePublications);
  }

  // Mobile nav toggle (kept minimal and CSS-driven)
  const navToggle = document.querySelector('.nav-toggle');
  const mainNav = document.getElementById('main-nav');

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      mainNav.classList.toggle('open');
    });

    // Close nav when a link is clicked (on mobile)
    mainNav.addEventListener('click', (e) => {
      if (e.target.tagName === 'A' && window.innerWidth <= 768) {
        navToggle.setAttribute('aria-expanded', 'false');
        mainNav.classList.remove('open');
      }
    });

    // Close nav when resizing to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        navToggle.setAttribute('aria-expanded', 'false');
        mainNav.classList.remove('open');
      }
    });

    // Allow Escape to close the menu
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        navToggle.setAttribute('aria-expanded', 'false');
        mainNav.classList.remove('open');
      }
    });
  }

  // Turn project image links into accessible image galleries.
  document.querySelectorAll('.project-gallery-link').forEach(button => {
    button.addEventListener('click', () => {
      const images = (button.dataset.gallery || '')
        .split('|')
        .map(image => image.trim())
        .filter(Boolean);

      if (images.length > 0) {
        modalReturnFocus = button;
        openGallery(images, button.dataset.galleryAlt || 'Project screenshot', 0);
      }
    });
  });

  // Support horizontal swiping through project galleries on touch devices.
  const modalImage = document.getElementById('modalImage');
  if (modalImage) {
    let touchStartX = null;
    let touchStartY = null;

    modalImage.addEventListener('touchstart', event => {
      const touch = event.changedTouches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: true });

    modalImage.addEventListener('touchend', event => {
      if (touchStartX === null || touchStartY === null || modalGallery.length < 2) return;

      const touch = event.changedTouches[0];
      const horizontalDistance = touch.clientX - touchStartX;
      const verticalDistance = touch.clientY - touchStartY;
      touchStartX = null;
      touchStartY = null;

      if (Math.abs(horizontalDistance) >= 50 && Math.abs(horizontalDistance) > Math.abs(verticalDistance)) {
        changeGalleryImage(horizontalDistance > 0 ? -1 : 1);
      }
    }, { passive: true });
  }

  // Highlight the current nav link
  try {
    const navLinks = document.querySelectorAll('#main-nav a');
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    navLinks.forEach(a => {
      const href = a.getAttribute('href');
      // Normalize index.html and root
      if (href === currentPath || (href === 'index.html' && currentPath === '')) {
        a.classList.add('nav-active');
        a.setAttribute('aria-current', 'page');
      }
      // Also handle anchors like index.html#about
      if (href && href.split('#')[0] === currentPath) {
        a.classList.add('nav-active');
        a.setAttribute('aria-current', 'page');
      }
    });
  } catch (e) {
    // ignore
  }
});

// Load publications from JSON file
function loadPublications() {
  fetch('publications.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log("Publications loaded successfully:", data);
      allPublications = data.publications;
      renderPublications(true);
    })
    .catch(error => {
      console.error('Error loading publications:', error);
      // Create fallback publications display if JSON loading fails
      displayFallbackPublications();
    });
}

// Fallback if JSON loading fails
function displayFallbackPublications() {
  const container = document.getElementById('publications-container');
  if (!container) return; // nothing to do on pages without publications
  container.innerHTML = `Error loading publications.`;
}

// Toggle between showing all or selected publications
function togglePublications() {
  showingSelected = !showingSelected;
  renderPublications(showingSelected);
  
  // Update button text
  const toggleButton = document.getElementById('toggle-publications');
  if (toggleButton) toggleButton.textContent = showingSelected ? 'Show All' : 'Show Selected';
  const toggleHeader = document.getElementById('toggle-header');
  if (toggleHeader) toggleHeader.textContent = showingSelected ? 'Selected Publications' : 'All Publications';
}

// Render publications based on selection state
function renderPublications(selectedOnly) {
  const publicationsContainer = document.getElementById('publications-container');
  if (!publicationsContainer) return; // nothing to render on this page
  publicationsContainer.innerHTML = '';

  const pubsToShow = selectedOnly ? 
    allPublications.filter(pub => pub.selected === 1) : 
    allPublications;

  pubsToShow.forEach(publication => {
    const pubElement = createPublicationElement(publication);
    publicationsContainer.appendChild(pubElement);
  });
}

// Create HTML element for a publication
function createPublicationElement(publication) {
  const pubItem = document.createElement('div');
  pubItem.className = 'publication-item';
  
  // Create thumbnail
  const thumbnail = document.createElement('div');
  thumbnail.className = 'pub-thumbnail';
  thumbnail.onclick = () => openModal(publication.thumbnail);
  
  const thumbnailImg = document.createElement('img');
  thumbnailImg.src = publication.thumbnail;
  thumbnailImg.alt = `${publication.title} thumbnail`;
  thumbnail.appendChild(thumbnailImg);
  
  // Create content container
  const content = document.createElement('div');
  content.className = 'pub-content';
  
  // Add title
  const title = document.createElement('div');
  title.className = 'pub-title';
  title.textContent = publication.title;
  content.appendChild(title);
  
  // Add authors with highlight
  const authors = document.createElement('div');
  authors.className = 'pub-authors';
  
  // Format authors with highlighting
  let authorsHTML = '';
  publication.authors.forEach((author, index) => {
    // Highlight your name when it appears in the author list
    if (author.includes('Ahmad D. Suleiman')) {
      authorsHTML += `<span class="highlight-name">${author}</span>`;
    } else {
      authorsHTML += author;
    }

    if (index < publication.authors.length - 1) {
      authorsHTML += ', ';
    }
  });
  
  authors.innerHTML = authorsHTML;
  content.appendChild(authors);
  
  // Add venue with award if present
  const venueContainer = document.createElement('div');
  venueContainer.className = 'pub-venue-container';
  
  const venue = document.createElement('div');
  venue.className = 'pub-venue';
  venue.textContent = publication.venue;
  venueContainer.appendChild(venue);
  
  // Add award if it exists
  if (publication.award && publication.award.length > 0) {
    const award = document.createElement('div');
    award.className = 'pub-award';
    award.textContent = publication.award;
    venueContainer.appendChild(award);
  }
  
  content.appendChild(venueContainer);
  
  // Add links if they exist
  if (publication.links) {
    const links = document.createElement('div');
    links.className = 'pub-links';
    
    if (publication.links.pdf) {
      const pdfLink = document.createElement('a');
      pdfLink.href = publication.links.pdf;
      pdfLink.target = '_blank';
      pdfLink.rel = 'noopener noreferrer';
      pdfLink.textContent = publication.links.pdf.includes('doi.org') ? '[DOI]' : '[PDF]';
      links.appendChild(pdfLink);
    }
    
    if (publication.links.arxiv) {
      const arxivLink = document.createElement('a');
      arxivLink.href = publication.links.arxiv;
      arxivLink.target = '_blank';
      arxivLink.rel = 'noopener noreferrer';
      arxivLink.textContent = '[arXiv]';
      links.appendChild(arxivLink);
    }

    if (publication.links.code) {
      const codeLink = document.createElement('a');
      codeLink.href = publication.links.code;
      codeLink.target = '_blank';
      codeLink.rel = 'noopener noreferrer';
      codeLink.textContent = '[Code]';
      links.appendChild(codeLink);
    }
    
    if (publication.links.project) {
      const projectLink = document.createElement('a');
      projectLink.href = publication.links.project;
      projectLink.target = '_blank';
      projectLink.rel = 'noopener noreferrer';
      projectLink.textContent = publication.links.project.includes('arxiv.org') ? '[arXiv]' : '[Project Page]';
      links.appendChild(projectLink);
    }
    
    if (links.children.length > 0) {
      content.appendChild(links);
    }
  }
  
  // Assemble the publication item
  pubItem.appendChild(thumbnail);
  pubItem.appendChild(content);
  
  return pubItem;
}

// Modal functionality for viewing original images
function openModal(imageSrc) {
  openGallery([imageSrc], 'Publication image', 0);
}

function openGallery(images, altText, startIndex) {
  const modal = document.getElementById('imageModal');
  const modalImg = document.getElementById('modalImage');
  if (!modal || !modalImg || !images || images.length === 0) return;

  modalGallery = images;
  modalGalleryIndex = Math.min(Math.max(startIndex || 0, 0), images.length - 1);
  modalGalleryAlt = altText || 'Image preview';
  modal.style.display = "block";
  document.body.style.overflow = 'hidden';
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);
  showGalleryImage();

  const closeButton = modal.querySelector('.modal-close');
  if (closeButton) closeButton.focus();
}

function showGalleryImage() {
  const modalImg = document.getElementById('modalImage');
  const counter = document.getElementById('modalCounter');
  const previousButton = document.querySelector('#imageModal .modal-prev');
  const nextButton = document.querySelector('#imageModal .modal-next');
  if (!modalImg || modalGallery.length === 0) return;

  modalImg.src = modalGallery[modalGalleryIndex];
  modalImg.alt = modalGallery.length > 1
    ? `${modalGalleryAlt}, image ${modalGalleryIndex + 1} of ${modalGallery.length}`
    : modalGalleryAlt;

  const hasMultipleImages = modalGallery.length > 1;
  if (counter) {
    counter.textContent = hasMultipleImages
      ? `${modalGalleryIndex + 1} / ${modalGallery.length}`
      : '';
    counter.hidden = !hasMultipleImages;
  }
  if (previousButton) previousButton.hidden = !hasMultipleImages;
  if (nextButton) nextButton.hidden = !hasMultipleImages;
}

function changeGalleryImage(direction) {
  if (modalGallery.length < 2) return;
  modalGalleryIndex = (modalGalleryIndex + direction + modalGallery.length) % modalGallery.length;
  showGalleryImage();
}

function closeModal() {
  const modal = document.getElementById('imageModal');
  if (!modal) return;
  modal.classList.remove('show');
  document.body.style.overflow = '';
  setTimeout(() => {
    modal.style.display = "none";
  }, 300);

  if (modalReturnFocus) {
    modalReturnFocus.focus();
    modalReturnFocus = null;
  }
}

// Close modal when clicking outside the image
window.onclick = function(event) {
  const modal = document.getElementById('imageModal');
  if (modal && event.target == modal) {
    closeModal();
  }
}

document.addEventListener('keydown', event => {
  const modal = document.getElementById('imageModal');
  if (!modal || modal.style.display !== 'block') return;

  if (event.key === 'Escape') {
    closeModal();
  } else if (event.key === 'ArrowLeft') {
    changeGalleryImage(-1);
  } else if (event.key === 'ArrowRight') {
    changeGalleryImage(1);
  }
});
