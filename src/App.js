import "./app.scss";
import {useEffect, useState} from "react";

const App = () => {
    // The states of the application that we will use, I describe each of them below
    const [currentLocation, setCurrentLocation] = useState(""); //The current location field
    const [destination, setDestination] = useState(""); // The destination field
    const [date, setDate] = useState(""); // The date field
    const [time, setTime] = useState(""); // The time field

    // The state which is used to compare with the obtained time.
    // Since the api returns data with +- 1 hour from the time that was specified
    const [savedTime, setSavedTime] = useState("");

    const [token, setToken] = useState(null); // API token used for requests
    const [tickets, setTickets] = useState(null); // The data obtained from API

    const [found, setFound] = useState(true);
    const [error, setError] = useState(""); // A flag that indicates whether the data we are looking for was found

    // The code in useEffect() will only be executed once, at page load time.
    // This is to get the token and save it before it starts.
    useEffect(() => {
        // Calling the API from the documentation to get a token
        fetch("https://test.api.amadeus.com/v1/security/oauth2/token",{
            method: "POST",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded '
            },
            body: "grant_type=client_credentials&client_id=5RzikAq40B23yQDiNZHb5o8LOTZngUPl&client_secret=7ZrjLSWA98jVQLx6"
        })
        .then((res) => res.json()) // Decode the data to json
        .then(data => setToken(data.access_token)); // Save token
    },[])

    // The function that is called when the user presses the Search button
    const onSearch = async () => {
        setError(""); // Reset error
        setSavedTime(time); // Save time

        // Get city code of current location
        const currentData = await fetch(`https://test.api.amadeus.com/v1/reference-data/locations/cities?keyword=${currentLocation}&max=3`,{
            mode: 'cors',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }).then(res => res.json());

        // Get city code of destination
        const destinationData = await fetch(`https://test.api.amadeus.com/v1/reference-data/locations/cities?keyword=${destination}&max=3`,{
            mode: 'cors',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }).then(res => res.json());

        // Check the entered data
        if(currentData.hasOwnProperty("warnings"))
        {
            // If the data is correct, we display an error message
            setError("Current location is wrong");
            setTickets(null);
            return;
        }

        if(destinationData.hasOwnProperty("warnings"))
        {
            setError("Destination is wrong");
            setTickets(null);
            return;
        }

        // Save city codes to variables
        ;let currentIata = null;
        let destinationIata = null

        // Because the api returns several city codes, and we only need the one with the airport,
        // we search each city in the array and look for where there is an iataCode.
        // Then we write the code into a variable and exit the loop
        for(let currCity of currentData.data)
        {
            if(currCity.hasOwnProperty('iataCode')) {
                currentIata = currCity.iataCode;
                break;
            }
        }

        // Same for destination
        for(let destCity of destinationData.data)
        {
            if(destCity.hasOwnProperty('iataCode')) {
                destinationIata = destCity.iataCode;
                break;
            }
        }

        // This is the data that will be sent with the request and is needed to get tickets,
        // here we set values to the desired fields.
        const data = {
            "originDestinations": [
                {
                    "id": "1",
                    "originLocationCode": currentIata,
                    "destinationLocationCode": destinationIata,
                    "departureDateTimeRange": {
                        "date": date,
                        "time": time.concat(':00'),
                        "timeWindow": "1H"
                    }
                }
            ],
            "travelers": [
                {
                    "id": "1",
                    "travelerType": "ADULT"
                }
            ],
            "sources": [
                "GDS"
            ]
        };

        // Request for tickets
        fetch("https://test.api.amadeus.com/v2/shopping/flight-offers",{
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)})
            .then(res => res.json())
            .then(data => {
                setFound(false);
                setTickets(data.data); // Save ticket to state
            });
    }

  return (
    <div className="App">
      <div className="input-box">
          <input type="text" placeholder="Current location" required value={currentLocation} onChange={(e) => setCurrentLocation(e.target.value)}/>
          <input type="text" placeholder="Destination location" required value={destination} onChange={(e) => setDestination(e.target.value)}/>
          <input type="date" placeholder="Date" required value={date} onChange={(e) => setDate(e.target.value)}/>
          <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
      </div>

        <button onClick={onSearch}>Search</button>
        <p className="error">{error ? error : ""} </p>
        <p className="error">{!found ? "No tickets found" : ""} </p>
        {   // The place where tickets are displayed on the screen.
            // Here we check if tickets state is null or undefined, if it is not, then the loop is started
        tickets !== null && tickets !== undefined ? tickets.map((ticket) => {

            // We get the number of segments, because there can be more than one
            const segmentCount = ticket.itineraries[0].segments.length;

            // Here we get the time and date of departure
            const departureTime = new Date(ticket.itineraries[0].segments[0].departure.at).toLocaleString(undefined,{hour12: false, hour:'2-digit', minute:'2-digit'});

            // Since the time and date received from the api looks something like "2022-07-18T09:00:00",
            // we split the string in two using T as a separator and take only the first part
            const departureDate = ticket.itineraries[0].segments[0].departure.at.split('T')[0];

            // The same as above
            const arrivalTime = new Date(ticket.itineraries[0].segments[segmentCount - 1].arrival.at).toLocaleString(undefined,{hour:'2-digit', minute:'2-digit'});
            const arrivalDate = ticket.itineraries[0].segments[segmentCount - 1].arrival.at.split('T')[0];

            // Here we check the time of the ticket with what we need
            if(departureTime === savedTime) {
                if(!found)
                    setFound(true);
                // If the time is the same, then just print the ticket with the right data
                return <div className="ticket">
                <div className="road">
                    <div className="current">
                        <h1>{departureTime}</h1>
                        <span>{departureDate}</span>
                        <p>{ticket.itineraries[0].segments[0].departure.iataCode}</p>
                    </div>
                    <i className="gg-arrow-long-right"></i>
                    <div className="destination">
                        <h1>{arrivalTime}</h1>
                        <span>{arrivalDate}</span>
                        <p>{ticket.itineraries[0].segments[segmentCount - 1].arrival.iataCode}</p>
                    </div>
                </div>
                <div className="separator"></div>
                <div className="info">
                    <p>€{ticket.price.total}</p>
                </div>
            </div>
             }

            }):
            <p></p>}

    </div>
  );
}

export default App;
