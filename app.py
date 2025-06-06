import os

from math import radians, degrees, sin, cos, asin, acos, sqrt, pi

import pandas as pd
import numpy as np

import sqlalchemy
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import Session
from sqlalchemy import create_engine

from flask import Flask, jsonify, render_template, url_for
from flask_sqlalchemy import SQLAlchemy

from werkzeug.routing import BaseConverter

class ListConverter(BaseConverter):

    def to_python(self, value):
        return value.split('+')

    def to_url(self, values):
        return '+'.join(BaseConverter.to_url(value)
                        for value in values)

app = Flask(__name__)

app.url_map.converters['list'] = ListConverter

#app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///static/data/ghcn.db"
#db = SQLAlchemy(app)

# reflect an existing database into a new model
#Base = automap_base()
# reflect the tables
#Base.prepare(db.engine, reflect=True)

DATABASE = "sqlite:///static/data/ghcn.db"

with app.app_context():
    engine = create_engine(DATABASE)
    conn = engine.connect()
    session = Session(engine)

# reflect an existing database into a new model
Base = automap_base()

# reflect the tables
Base.prepare(autoload_with=engine, reflect=True)

# Save references to each table
Inventory = Base.classes.inventory
Stations = Base.classes.stations

@app.route("/testing/<list:variable_args>")
def testing(variable_args):
    print(variable_args)
    for variable in variable_args:
        print(variable)
    return jsonify(variable_args)

def df_to_geojson(df, properties, lat='latitude', lon='longitude'):
    # print(df)
    geojson = {'type':'FeatureCollection', 'features':[]}
    for _, row in df.iterrows():
        feature = {'type':'Feature',
                   'properties':{},
                   'geometry':{'type':'Point',
                               'coordinates':[]}}
        feature['geometry']['coordinates'] = [row[lon],row[lat]]
        for prop in properties:
            feature['properties'][prop] = row[prop]
        geojson['features'].append(feature)

    # print(geojson)

    return jsonify(geojson)

def find_stations_with(session, element, lon_min, lon_max, lat_min, lat_max, first_year=None, last_year=None,):
    """
    Args:  
        element: one of the elements in the inventory table.
        first_year: the earliest year that must be included.  If None, we do not filter on first_year
        last_year: the latest year that must be included.  If None, we do not filter on last_year
    """
    
    if first_year:
        if last_year: 
            t = session.query(
                Inventory.station_id,
             ).filter(Inventory.first_year <= first_year)\
            .filter(Inventory.last_year >= last_year)\
            .filter(Inventory.element == element).subquery('t')
        else:
            t = session.query(
                Inventory.station_id,
            ).filter(Inventory.first_year <= first_year)\
            .filter(Inventory.element == element).subquery('t')
    else:
        if last_year: 
            t = session.query(
                Inventory.station_id,
            ).filter(Inventory.last_year >= last_year)\
            .filter(Inventory.element == element).subquery('t')
        else:
            t = session.query(
                Inventory.station_id,
            ).filter(Inventory.element == element).subquery('t')
        

    query = session.query(Stations).filter(Stations.station_id == t.c.station_id)\
    .filter(Stations.longitude >= lon_min)\
    .filter(Stations.longitude <= lon_max)\
    .filter(Stations.latitude >= lat_min)\
    .filter(Stations.latitude <= lat_max)

    return pd.read_sql(query.statement, session.bind)

def find_stations_near(session, lon, lat, radius, element, miles=False, first_year=None, last_year=None):

    def great_circle_distance(lon1, lat1, lon2, lat2, miles=False):
        """
        Compute the Great Circle Distance between two points given by longitude and latitude, in degrees,
        on the surface of the Earth.   Code is modified from:  
        https://medium.com/@petehouston/calculate-distance-of-two-locations-on-earth-using-python-1501b1944d97
        """
        # Radius of the Earth
        if miles:
            multiplier = 3958.756
        else:
            multiplier = 6378.137
            
        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
        
        return multiplier * (
            acos(sin(lat1) * sin(lat2) + cos(lat1) * cos(lat2) * cos(lon1 - lon2))
        )

    def bounding_box(lon, lat, distance, miles=False):
        """
        Return bounding coordinates that includes all points within the given distance of the point given by lon, lat.
        Based on the code given by Jan Philip Matuschek at:
        http://janmatuschek.de/LatitudeLongitudeBoundingCoordinates
        """     
        # Radius of the Earth
        if miles:
            multiplier = 3958.756
        else:
            multiplier = 6378.137
        
        lon, lat = map(radians, [lon, lat])
        
        # angular distance in radians on a great circle
        rad_dist = distance / multiplier

        min_lat = lat - rad_dist
        max_lat = lat + rad_dist
        
        if min_lat > radians(-90) and max_lat < radians(90):
            delta_lon = asin(sin(rad_dist) / cos(lat))
            
            min_lon = lon - delta_lon
            if min_lon < radians(-180):
                min_lon += 2 * pi
                
            max_lon = lon + delta_lon
            if max_lon > radians(180):
                max_lon -= 2 * pi
        
        else:
            # a pole is within the distance
            min_lat = max(min_lat, radians(-90))
            max_lat = min(max_lat, radians(90))
            min_lon = radians(-180)
            max_lon = radians(180)

        return map(degrees, [min_lon, max_lon, min_lat, max_lat])

    # First get the bounding box to limit the search:
    lon_min, lon_max, lat_min, lat_max = bounding_box(lon, lat, radius, miles)
    
    # now query the database for all points within bounding box 
    df = find_stations_with(session, element, lon_min, lon_max, lat_min, lat_max, first_year, last_year)
    
    distance = []
    # now compute the great circle distance to each station
    for row in df.itertuples():
        distance.append(great_circle_distance(lon, lat, row.longitude, row.latitude, miles))

    df['distance'] = distance
    
    return df[df.distance <= radius]

"""
App routes 
"""
@app.route("/")
def index():
    """Return the homepage."""
    return render_template("index.html")

@app.route("/find_stations/<list:search_args>")
def find_stations(search_args):
    print("-"*50)
    print(search_args)
    element = search_args[0]
    first_year = int(search_args[1])
    last_year = int(search_args[2])
    longitude = float(search_args[3])
    latitude = float(search_args[4])
    radius = float(search_args[5])

    df = find_stations_near(session, longitude, latitude, radius, element, False, first_year, last_year)
    #if not df.empty:
    #    df.set_index('station_id', inplace=True)
    
    data = df.to_json(orient='records')
    # The NaNs were causing the problem in js. df.to_json fixes this
    '''
    data = []

    for row in df.itertuples():
        row_dict = {
            'station': row.station_id,
            'country': row.country_id,
            'state': row.state_id,
            'longitude': row.longitude,
            'latitude': row.latitude,
            'elevation': row.elevation,
            'name': row.name,
            'gsn': row.gsn,
            'hcn': row.hcn,
            'wmo': row.wmo
        }
        data.append(row_dict)
    '''

    print(df.head())
    print(df.shape)
    #print(data[:5])
    print("-"*50)
    return data

if __name__ == "__main__":
    app.run()
