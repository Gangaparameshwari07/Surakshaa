import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { collection, doc, setDoc, getDoc, updateDoc, query, where, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// --- UI Element References ---
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const signUpBtn = document.getElementById('signUpBtn');
const signInBtn = document.getElementById('signInBtn');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const authStatus = document.getElementById('authStatus');
const qrScanBtn = document.getElementById('qrScanBtn');
const checkOutBtn = document.getElementById('checkOutBtn');
const sosBtn = document.getElementById('sosBtn'); // New SOS button
const trekkersList = document.getElementById('trekkersList'); // New trekkers list


// --- Firebase Authentication & UI Setup ---
async function setupAppListeners() {
    
    const auth = window.firebaseAuth;
    const db = window.firebaseDb;

    
    if (!auth || !db) {
        console.error("Firebase auth or db not available in app.js yet. Retrying setup.");
        setTimeout(setupAppListeners, 500);
        return;
    }

    // --- Authentication State Listener ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            authStatus.textContent = `Signed in as: ${user.email || user.displayName}`;
            signUpBtn.style.display = 'none';
            signInBtn.style.display = 'none';
            googleSignInBtn.style.display = 'none';
            emailInput.style.display = 'none';
            passwordInput.style.display = 'none';
            signOutBtn.style.display = 'inline-block';
            qrScanBtn.style.display = 'inline-block';
            sosBtn.style.display = 'inline-block'; // Show SOS button
            await checkUserCheckInStatus(user.uid); // Check if already checked in
        } else {
            authStatus.textContent = 'Not signed in.';
            signUpBtn.style.display = 'inline-block';
            signInBtn.style.display = 'inline-block';
            googleSignInBtn.style.display = 'inline-block';
            emailInput.style.display = 'inline-block';
            passwordInput.style.display = 'inline-block';
            signOutBtn.style.display = 'none';
            qrScanBtn.style.display = 'none';
            checkOutBtn.style.display = 'none';
            sosBtn.style.display = 'none'; // Hide SOS button
            stopLocationTracking();
            updateUserMarkerIcon('signedOut'); // Change marker to signed out state
        }
    });

    // --- Event Listeners for Auth Buttons ---
    signUpBtn.addEventListener('click', async () => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
            console.log('User signed up:', userCredential.user.email);
            await setDoc(doc(db, "users", userCredential.user.uid), {
                email: userCredential.user.email,
                displayName: userCredential.user.displayName || emailInput.value,
                is_checked_in: false,
                is_in_distress: false // New field for SOS
            });
            alert('Signed up successfully! You can now sign in or simulate QR scan.');
        } catch (error) {
            console.error('Sign up error:', error.message);
            alert(`Sign up failed: ${error.message}`);
        }
    });

    signInBtn.addEventListener('click', async () => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
            console.log('User signed in:', userCredential.user.email);
        } catch (error) {
            console.error('Sign in error:', error.message);
            alert(`Sign in failed: ${error.message}`);
        }
    });

    googleSignInBtn.addEventListener('click', async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            console.log('Signed in with Google:', result.user.email);
            const userRef = doc(db, "users", result.user.uid);
            const docSnap = await getDoc(userRef);
            if (!docSnap.exists()) {
                await setDoc(userRef, {
                    email: result.user.email,
                    displayName: result.user.displayName,
                    is_checked_in: false,
                    is_in_distress: false
                });
            }
        } catch (error) {
            console.error('Google sign in error:', error.message);
            alert(`Google sign in failed: ${error.message}`);
        }
    });

    signOutBtn.addEventListener('click', async () => {
        try {
            // Also update user's checked_in status in Firestore upon sign out
            if (auth.currentUser) {
                await updateDoc(doc(db, "users", auth.currentUser.uid), {
                    is_checked_in: false,
                    is_in_distress: false
                });
            }
            await signOut(auth);
            console.log('User signed out.');
            alert('You have been signed out.');
        } catch (error) {
            console.error('Sign out error:', error.message);
            alert(`Sign out failed: ${error.message}`);
        }
    });

    // --- Check-in/Check-out Logic ---
    qrScanBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (user) {
            try {
                const checkInDocRef = doc(db, "check_ins", user.uid);
                await setDoc(checkInDocRef, {
                    userId: user.uid,
                    email: user.email,
                    checkInTime: new Date(),
                    checkOutTime: null,
                    status: "checked_in",
                    currentLocation: null
                });
                await updateDoc(doc(db, "users", user.uid), {
                    is_checked_in: true,
                    is_in_distress: false // Reset distress on check-in
                });

                alert(`Checked in at the trailhead! Start your trek. Your location is now being tracked.`);
                qrScanBtn.style.display = 'none';
                checkOutBtn.style.display = 'inline-block';
                startLocationTracking(user.uid);
                updateUserMarkerIcon('checkedIn'); // Change marker to checked in state
            } catch (error) {
                console.error('Check-in error:', error.message);
                alert(`Failed to check in: ${error.message}`);
            }
        } else {
            alert('Please sign in first to simulate QR scan and check in.');
        }
    });

    checkOutBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (user) {
            try {
                const checkInDocRef = doc(db, "check_ins", user.uid);
                await updateDoc(checkInDocRef, {
                    checkOutTime: new Date(),
                    status: "checked_out"
                });
                await updateDoc(doc(db, "users", user.uid), {
                    is_checked_in: false,
                    is_in_distress: false // Reset distress on check-out
                });

                alert('Checked out successfully! Your journey tracking has ended.');
                qrScanBtn.style.display = 'inline-block';
                checkOutBtn.style.display = 'none';
                stopLocationTracking();
                updateUserMarkerIcon('checkedOut'); // Change marker to checked out state
            } catch (error) {
                console.error('Check-out error:', error.message);
                alert(`Failed to check out: ${error.message}`);
            }
        }
    });
firebaseAuth.onAuthStateChanged(user => {
    if (user) {
        window.currentUserId = user.uid;
        authStatus.innerText = `Signed in as: ${user.email}`;
        console.log("User signed in:", user.email);
        authControls.style.display = 'none';
        appControls.style.display = 'block';

        // ADD THIS LINE HERE:
        sosButton.disabled = false; // Enable SOS button on sign-in

        // ... rest of your code inside the if (user) block ...
        // (like starting location tracking, updating marker, setting up trekkers listener)

        setupRealtimeTrekkerListener();

    } else {
        window.currentUserId = null;
        authStatus.innerText = 'Not signed in.';
        console.log("User signed out.");
        authControls.style.display = 'block';
        appControls.style.display = 'none';
        stopLocationTracking();
        if (window.userMarker) {
            window.userMarker.setVisible(false); // Hide user marker
        }
        trekkersList.innerHTML = '<li>No trekkers currently checked-in.</li>'; // Clear trekkers list

        // OPTIONAL: You might want to disable it on sign-out too
        sosButton.disabled = true;
    }
});
    // --- SOS / Help Me Button Logic ---
    sosBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (user) {
            if (confirm("Are you sure you need to send an SOS signal? This will notify guardians.")) {
                try {
                    await updateDoc(doc(db, "users", user.uid), {
                        is_in_distress: true,
                        distress_time: new Date(),
                        
                    });
                    alert("SOS signal sent! Help is on the way.");
                    sosBtn.disabled = true; // Disable button after sending
                    updateUserMarkerIcon('distress'); // Change marker to distress state
                } catch (error) {
                    console.error("Error sending SOS:", error.message);
                    alert(`Failed to send SOS: ${error.message}`);
                }
            }
        } else {
            alert('Please sign in to send an SOS signal.');
        }
    });
} 


// --- Check-in Status Function ---
async function checkUserCheckInStatus(uid) {
    const db = window.firebaseDb;
    if (!db) {
        console.error("Firestore DB not available for checkUserCheckInStatus.");
        return;
    }

    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists() && docSnap.data().is_checked_in) {
        qrScanBtn.style.display = 'none';
        checkOutBtn.style.display = 'inline-block';
        startLocationTracking(uid);
        updateUserMarkerIcon('checkedIn');
        // Check for distress state on load
        if (docSnap.data().is_in_distress) {
            updateUserMarkerIcon('distress');
            sosBtn.disabled = true;
        } else {
            sosBtn.disabled = false;
        }
    } else {
        qrScanBtn.style.display = 'inline-block';
        checkOutBtn.style.display = 'none';
        stopLocationTracking();
        updateUserMarkerIcon('signedIn'); // Just signed in, not checked in
        sosBtn.disabled = true; // SOS only active when checked in
    }
}

// --- Location Tracking Functions ---
let locationTrackingInterval;
let currentUserTrackingId = null;
let lastSentLocation = null;
const LOCATION_UPDATE_INTERVAL = 10 * 1000; 

function startLocationTracking(userId) {
    // Access globals directly from window when the function runs
    const auth = window.firebaseAuth;
    const db = window.firebaseDb;
    const map = window.map;
    const userMarker = window.userMarker;

    // Critical check for globals
    if (!auth || !db || !map || !userMarker) {
        console.error("Critical globals missing for startLocationTracking. Retrying...");
        setTimeout(() => startLocationTracking(userId), 500);
        return;
    }

    if (currentUserTrackingId === userId && locationTrackingInterval) {
      return; // Already tracking for this user
    }
    stopLocationTracking(); // Stop any previous tracking
    currentUserTrackingId = userId;

    console.log("Starting location tracking for user:", userId);

    locationTrackingInterval = setInterval(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const newPos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };

                    // Only update Firestore if location has significantly changed
                    if (!lastSentLocation ||
                        Math.abs(newPos.lat - lastSentLocation.lat) > 0.0001 || // ~11 meters for lat, ~9 meters for lng in India
                        Math.abs(newPos.lng - lastSentLocation.lng) > 0.0001) {

                        console.log("Updating location for", userId, ":", newPos);
                        try {
                            await updateDoc(doc(db, "check_ins", userId), {
                                currentLocation: newPos,
                                lastUpdated: new Date()
                            });
                            // Also update user's main profile for real-time trekkers list
                            await updateDoc(doc(db, "users", userId), {
                                currentLocation: newPos // Store user's last known location here
                            });
                            lastSentLocation = newPos;
                        } catch (error) {
                            console.error("Error updating location in Firestore:", error.message);
                        }
                    } else {
                        console.log("Location not significantly changed, skipping update.");
                    }

                    // Always update userMarker and center map if current user and marker available
                    if (userMarker && userId === auth.currentUser?.uid) {
                        userMarker.setPosition(newPos);
                        map.setCenter(newPos); // Keeps the map centered on the user
                    }
                },
                (error) => {
                    console.error("Geolocation error during tracking:", error.message);
                    // Handle specific errors for user feedback
                    let errorMessage = "Could not get your location.";
                    if (error.code === error.PERMISSION_DENIED) {
                        errorMessage = "Location access denied. Please allow location access in your browser settings.";
                    } else if (error.code === error.POSITION_UNAVAILABLE) {
                        errorMessage = "Location information is unavailable.";
                    } else if (error.code === error.TIMEOUT) {
                        errorMessage = "The request to get user location timed out.";
                    }
                    console.error(errorMessage);
                    alert(errorMessage); // Alert user to permission issue
                },
                { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 } // Increased timeout
            );
        } else {
            console.warn("Geolocation not supported for tracking.");
            alert("Your browser does not support Geolocation, or it is disabled.");
        }
    }, LOCATION_UPDATE_INTERVAL);
}

function stopLocationTracking() {
    if (locationTrackingInterval) {
        clearInterval(locationTrackingInterval);
        locationTrackingInterval = null;
        currentUserTrackingId = null;
        console.log("Stopped location tracking.");
    }
}

window.updateUserMarkerIcon = (status) => {
    
    if (!window.userMarker) {
        console.warn("userMarker not available to update icon.");
        return;
    }

    let iconSettings = {};
    switch (status) {
        case 'checked_in':
        case 'signed_in_idle': // Use blue dot for both idle and checked-in states for clarity
            iconSettings = {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#4285F4', // Google Maps blue
                fillOpacity: 1,
                strokeColor: '#fff', // White border
                strokeWeight: 2,
                scale: 8, // Size of the dot
            };
            break;
        case 'distress':
            iconSettings = {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#DC3545', // Red for distress
                fillOpacity: 1,
                strokeColor: '#fff',
                strokeWeight: 2,
                scale: 10, // Slightly larger for distress
            };
            break;
        case 'checked_out':
            iconSettings = {
                
                url: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png', // Yellow dot pin
                scaledSize: new google.maps.Size(32, 32)
            };
            break;
        default:
            iconSettings = {
                url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png', // Default blue pin
                scaledSize: new google.maps.Size(32, 32)
            };
            break;
    }

    window.userMarker.setIcon(iconSettings);
    window.userMarker.setVisible(true); // Ensure marker is visible when icon is set
    console.log(`User marker icon updated to: ${status}`);
};


// --- Points of Interest (POI) Functions ---
const poiMarkers = []; // Array to keep track of POI markers

// This function is made globally accessible and called by map.js after it initializes.
window.loadPointsOfInterest = async function() {
    const db = window.firebaseDb;
    const map = window.map;

    if (!db || !map) {
        console.error("Firebase DB or Map not available for loading POIs. Retrying...");
        setTimeout(() => window.loadPointsOfInterest(), 500); // Retry if not ready
        return;
    }

    console.log("Setting up real-time POI listener...");

    // Use onSnapshot for real-time updates
    onSnapshot(collection(db, "points_of_interest"), (snapshot) => {
        console.log("Real-time POI update detected!");
        // Clear existing markers first
        poiMarkers.forEach(marker => marker.setMap(null));
        poiMarkers.length = 0; // Clear the array

        if (snapshot.empty) {
            console.log("No Points of Interest found.");
            return;
        }

        snapshot.forEach((doc) => {
            const poi = doc.data();
            const poiLatLng = {
                lat: poi.location.latitude,
                lng: poi.location.longitude
            };

            const marker = new google.maps.Marker({
                position: poiLatLng,
                map: map, // Use the now assigned 'map' global
                title: poi.name,
                icon: {
                    url: poi.icon || 'http://googleusercontent.com/mapfiles/ms/icons/green-dot.png', // Default POI icon
                    scaledSize: new google.maps.Size(32, 32)
                }
            });

            const infoWindow = new google.maps.InfoWindow({
                content: `<h3>${poi.name} (${poi.type})</h3><p>${poi.description}</p>`
            });

            marker.addListener("click", () => {
                infoWindow.open(map, marker);
            });

            poiMarkers.push(marker); // Add to the global array
        });
        console.log(`Loaded ${poiMarkers.length} Points of Interest (real-time).`);
    }, (error) => {
        console.error("Error listening to POI updates:", error.message);
    });
};


// --- Real-time Checked-in Trekkers List ---
function setupRealtimeTrekkersList() {
    const db = window.firebaseDb;
    if (!db || !trekkersList) {
        console.error("DB or trekkersList HTML element not available for user list.");
        return;
    }

    // Query for users who are currently checked_in OR in distress
    const q = query(collection(db, "users"), where("is_checked_in", "==", true));

    onSnapshot(q, (snapshot) => {
        trekkersList.innerHTML = ''; // Clear existing list
        if (snapshot.empty) {
            trekkersList.innerHTML = '<li>No trekkers currently checked-in.</li>';
            return;
        }
        snapshot.forEach((doc) => {
            const user = doc.data();
            const li = document.createElement('li');
            let statusText = user.is_in_distress ? '🆘 (Distress!)' : '(Checked-in)';
            li.innerHTML = `<strong>${user.displayName || user.email}</strong> ${statusText}`;

            
            if (user.currentLocation && map && google) {
                const latLng = new google.maps.LatLng(user.currentLocation.lat, user.currentLocation.lng);
                const latLngText = `Lat: ${latLng.lat().toFixed(4)}, Lng: ${latLng.lng().toFixed(4)}`;
                const locationLink = document.createElement('a');
                locationLink.href = '#';
                locationLink.textContent = 'View on map';
                locationLink.onclick = (e) => {
                    e.preventDefault();
                    map.setCenter(latLng);
                    map.setZoom(17);
                    // Optionally create a temporary marker or highlight their marker
                };
                li.appendChild(document.createElement('br'));
                li.appendChild(locationLink);
            }
            trekkersList.appendChild(li);
        });
        console.log("Updated real-time checked-in trekkers list.");
    }, (error) => {
        console.error("Error listening to real-time trekkers:", error.message);
    });
}


// --- Main Application Start Point ---
// Ensure the DOM is fully loaded before trying to access elements or setup listeners
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOMContentLoaded fired. Starting app setup.");

    // This will set up all button listeners and handle auth state,
    // and trigger location tracking/marker updates based on user status.
    await setupAppListeners();

    // Setup real-time trekkers list
    setupRealtimeTrekkersList();
});