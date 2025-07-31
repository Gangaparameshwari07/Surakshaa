// map.js
// Make map and userMarker globally accessible
window.map = null;
window.userMarker = null;

// The initMap function called by the Google Maps API loader
window.initMap = function() {
    const defaultLatLng = { lat: 20.5937, lng: 78.9629 }; // Center of India
    window.map = new google.maps.Map(document.getElementById("map"), { // Assign to window.map
        zoom: 5,
        center: defaultLatLng,
        mapId: "YOUR_MAP_ID" // Replace with your actual Map ID if needed
    });

    // Initialize user marker but don't place it until location is known
    window.userMarker = new google.maps.Marker({ // Assign to window.userMarker
        map: window.map, // Assign to map now, but position will be updated by app.js
        title: "Your Location",
        icon: {
            url: "http://googleusercontent.com/mapfiles/ms/icons/blue-dot.png", // Initial blue dot icon
            scaledSize: new google.maps.Size(40, 40)
        }
    });

    // Handle initial geolocation if available to set initial map view
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                window.map.setCenter(pos);
                window.map.setZoom(15); // Zoom in on user's approximate location
                if (window.userMarker) {
                    window.userMarker.setPosition(pos);
                }
            },
            (error) => {
                console.warn("Geolocation service failed (initial):", error.message);
                // No specific error handling here, map stays on default center
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );
    } else {
        console.warn("Browser doesn't support Geolocation. Using default center.");
    }

    console.log("Google Map initialized in map.js.");

    // IMPORTANT: Delay the call to loadPointsOfInterest slightly
    // This gives app.js a moment to fully load and define it.
    setTimeout(() => {
        if (typeof window.loadPointsOfInterest === 'function') {
            console.log("Calling loadPointsOfInterest from map.js after delay.");
            window.loadPointsOfInterest();
        } else {
            console.error("loadPointsOfInterest function still not found after map init delay. Check app.js.");
        }
    }, 1000);
};