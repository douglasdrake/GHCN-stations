# GHCN-stations

# The Global Historical Climatology Network
## Weather Station Inventory

As described by [The Global Historical Climatology Network](https://www.ncdc.noaa.gov/data-access/land-based-station-data/land-based-datasets/global-historical-climatology-network-ghcn), the GHCN is an integrated database of climate summaries 
from land surface stations across the 
globe that have been subjected to a common suite of quality assurance reviews. 
The data are obtained from more than 20 sources. Some data are more than 175 years old while 
others are less than an hour old.

As of Version: 3.27-upd-2019081018, there are 113,933 stations in the archive.  
We can search for stations by location and for the measurements that
are available. 

# Project
Create a tool to search for stations based on location and types of measurements available. This search tool currently 
limits the measurements to the five primary results: Precipitation, Maximum Temperature, Minimum Temperature, Snowfall, and Snow Depth.

# Methods
1.  A Python Class [`GHCN-Archive`](https://github.com/douglasdrake/GHCN-Archive) was created to download and maintain a copy of the `GHCN-Archive`.
2.  A SQLite database of the GHCN stations and GHCN inventory of measurements was created using SQLAlchemy. 
3.  A Flask Web App was written to render the search template and return search results.  SQLAlchemy is 
used for querying the database.
    *  To query stations based on distance from a given coordinate, we first compute a bounding box using code given by:
        [http://janmatuschek.de/LatitudeLongitudeBoundingCoordinates](http://janmatuschek.de/LatitudeLongitudeBoundingCoordinates).
        This code finds a bounding box that contains all points within a great-circle distance radius of the target coordinate.
        This limits the number of stations for which we need to compute the great-circle distance to the target.
4.  Leaflet is used to plot the coordinates of the returned stations.
5.  D3 is used to render an HTML table with the station information.
6.  The App is deployed to Heroku [https://ghcn-leaflet.herokuapp.com/](https://ghcn-leaflet.herokuapp.com/).


# Useful Extension (Further Work)
1.  Use geocoding to find the station(s) closest to a given city.

## Citation:
Menne, M.J., I. Durre, R.S. Vose, B.E. Gleason, and T.G. Houston, 2012:  *An overview 
of the Global Historical Climatology Network-Daily Database*.  Journal of Atmospheric 
and Oceanic Technology, 29, 897-910, doi:10.1175/JTECH-D-11-00103.1.

Menne, M.J., I. Durre, B. Korzeniewski, S. McNeal, K. Thomas, X. Yin, S. Anthony, R. Ray, 
R.S. Vose, B.E.Gleason, and T.G. Houston, 2012: *Global Historical Climatology Network - 
Daily (GHCN-Daily)*, Version 3.27.

