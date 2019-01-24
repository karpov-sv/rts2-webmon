class FramClient extends React.Component {
    render() {
        var client = this.props.client;
        var status = this.props.status;

        var cstate = 0;

        var body_class = "disabled-controls";

        var head_status = [];
        var night_info = null;
        var devices = [];

        window.client = client;
        window.status = status;

        if (client.connected) {
            //head_status.push(<Label className="success" key="connstatus">Connected</Label>);
            body_class = "";

            cstate = (status['centrald'] && status['centrald'].connected) ? status['centrald'].state : 0;

            // On/Off
            if ((cstate & 0x30) == 0x30)
                head_status.push(<Label className="danger" key="onoff">HARD OFF</Label>);
            else if ((cstate & 0x30) == 0x10)
                head_status.push(<Label className="warning" key="onoff">Standby</Label>);
            else
                head_status.push(<Label className="success" key="onoff">ON</Label>);

            // Day/Night
            if ((cstate & 0x0f) == 0)
                head_status.push(<Label className="danger" key="daynight">Day</Label>);
            else if ((cstate & 0x0f) == 1)
                head_status.push(<Label className="danger" key="daynight">Evening</Label>);
            else if ((cstate & 0x0f) == 2)
                head_status.push(<Label className="warning" key="daynight">Dusk</Label>);
            else if ((cstate & 0x0f) == 3)
                head_status.push(<Label className="success" key="daynight">Night</Label>);
            else if ((cstate & 0x0f) == 4)
                head_status.push(<Label className="warning" key="daynight">Dawn</Label>);
            else if ((cstate & 0x0f) == 5)
                head_status.push(<Label className="danger" key="daynight">Morning</Label>);

            // Weather
            if (cstate & 0x80000000)
                head_status.push(<Label className="danger" key="weather">Weather Bad</Label>);
            else
                head_status.push(<Label className="success" key="weather">Weather Good</Label>);

            // Dome
            if (status['DOME'] && (status['DOME'].state & 0x04))
                head_status.push(<Label className="success" key="dome">Dome Open</Label>);
            else
                head_status.push(<Label className="warning" key="dome">Dome Closed</Label>);


        } else
            head_status.push(<Label className="danger" key="connstatus">Disconnected</Label>);

        if (status) {
            // Current night and Moon info
            if (status['centrald'].connected)
                night_info = (
                    <div className="small text-muted" style={{padding: "5px"}}>
                      Night start <span className="text-info"><UnixTime time={status['centrald'].d.night_beginning}/></span> end <span className="text-info"><UnixTime time={status['centrald'].d.night_ending}/></span>.

                      Moon rise <span className="text-info"><UnixTime time={status['centrald'].d.moon_rise}/></span> set <span className="text-info"><UnixTime time={status['centrald'].d.moon_set}/></span>.

                      Lunar phase <span className="text-info">{status['centrald'].d.lunar_phase.toFixed(1)}</span> deg, limb <span className="text-info">{status['centrald'].d.lunar_limb.toFixed(1)}</span> deg, altitude <span className="text-info">{status['centrald'].d.moon_alt.toFixed(1)}</span> deg
                    </div>
                );

            // Devices
            for (var i = 0; i < client.devices.length; i++) {
                var name = client.devices[i];
                var type = status[name].type;

                var dev_class = "text-danger";
                var dev_body = null;
                var dev_sub = [];

                if (status[name].connected) {
                    var vars = status[name].d;
                    var state = status[name].state;

                    dev_body = status[name].statestring;

                    // Color coding of states
                    if ((state & 0xf0000) == 0x40000)
                        dev_class = "text-warning bg-warning";
                    else if (state & 0xf0000)
                        dev_class = "text-danger bg-danger";
                    else if (state & 0x80000000)
                        dev_class = "text-warning bg-warning";
                    else if (type == 2 && ((state & 0x07) == 1 || (state & 0x07) == 4))
                        dev_class = "text-info bg-info";
                    else if (type == 2 && state == 0)
                        dev_class = "text-danger bg-danger";
                    else if (type == 3 && (state & 0x03))
                        dev_class = "text-info bg-info";
                    else if (type == 4 && (state & 0x1a))
                        dev_class = "text-info bg-info";
                    else if (type == 10 && state)
                        dev_class = "text-info bg-info";
                    else
                        dev_class = "text-default";

                    // Device-specific sub-states

                    // centrald
                    if (type == 1 && (state & 0x80000000))
                        dev_sub.push(<span className="text-warning bg-warning" key="bad_weather">
                                       bad weather from {vars['bad_weather_device']} : {vars['bad_weather_reason']}
                                     </span>);

                    // mount
                    if (type == 2 && ((cstate & 0x0f) != 2 && (cstate & 0x0f) != 3 && (cstate & 0x0f) != 4) && (state & 0x07) != 2)
                        dev_sub.push(<span className="label label-danger" key="mount_not_parked">
                                       Mount is not parked
                                     </span>);

                    // camera
                    if (type == 3 && vars['SCRIPT'])
                        dev_sub.push(<span className="text-muted" key="camera_script">{vars['SCRIPT']}</span>);

                    // dome
                    if (type == 4) {
                        if (!(vars['sw_open_left']) && (state & 0x06))
                            dev_sub.push(<span className="label label-danger" key="sw_open_left">
                                           Left open switch is off
                                         </span>);

                        if (!(vars['sw_open_right']) && (state & 0x06))
                            dev_sub.push(<span className="label label-danger" key="sw_open_right">
                                           Right open switch is off
                                         </span>);

                        if (vars['12V'] == 0 || vars['12VDC'] == 0)
                            dev_sub.push(<span className="label label-danger" key="12v_off">
                                           12V is off
                                         </span>);
                    }

                    // weather
                    if (name == 'WEATHER') {
                        var elem;

                        if (client.name == 'cta-n')
                            elem = (<span className="text-muted" key={'weather1'}>
                                      wind { vars['windspeed'].toFixed(1) } m/s,
                                      temperature { vars['temperature'].toFixed(1) } C,
                                      humidity { vars['humidity'].toFixed(1) }%,
                                      pressure { vars['pressure'].toFixed(1) }.
                                    </span>);
                        else if (client.name == 'auger')
                            elem = (<span className="text-muted" key={'weather1'}>
                                      wind { (vars['windspeed']/3.6).toFixed(1) } m/s.
                                    </span>);

                        if (vars['rain'])
                            elem = [elem, <Label className="danger" key={'weather2'}>Rain</Label>];

                        if (elem)
                            dev_sub.push(elem);
                    }

                    // next-good-weather
                    if (vars['next_good_weather'] && vars['next_good_weather'] > now())
                        dev_sub.push(<span className="text-warning bg-warning">
                                       next good weather: <UnixTime time={vars['next_good_weather']}/>
                                     </span>);

                    // next-open
                    if (vars['next_open'] && vars['next_open'] > now())
                        dev_sub.push(<span className="text-warning bg-warning">
                                       next open: <UnixTime time={vars['next_open']}/>
                                     </span>);

                    // imgproc
                    if (type == 21) {
                        if (vars['free_diskspace'] && vars['free_diskspace']/1024/1024/1024 < 10)
                            dev_sub.push(<span className="label label-danger">Low disk space: {(vars['free_diskspace']/1024/1024/1024).toFixed(1)} Gb</span>);

                    }

                    // selector
                    if (type == 22) {
                        for (var qi = 0; qi < vars['queue_names'].length; qi++){
                            var queue = vars['queue_names'][qi];
                            var targets = [];

                            for (var ti = 0; ti < vars[queue+'_ids'].length; ti++){
                                var title = unixtime(vars[queue+'_start'][ti]) + " - " + unixtime(vars[queue+'_end'][ti]);

                                targets.push(<span className="label label-info" key={ti} title={title} style={{margin: "0.2em"}}>{vars[queue+'_ids'][ti] + ' / ' + vars[queue+'_names'][ti]}</span>);
                            }

                            if (targets.length)
                                dev_sub.push(<span>{queue}: {targets}</span>);
                        }
                    }
                }

                // Construct the piece describing single device
                var body = (
                    <span className={dev_class}>
                      <span style={{minWidth: "7em", display: "inline-block"}}>{name}</span>
                      {dev_body}
                      {dev_sub &&
                       <ul className="small">
                         {dev_sub.map((d,i) => {return <li key={i}>{d}</li>;})}
                       </ul>
                      }
                    </span>
                );

                devices.push(body);
            }
        }

        // Construct the component
        return (
            <div>
              <Panel expanded={client.connected}>
                <Panel.Heading>
                  <Panel.Title componentClass='h3'>
                    {client.name}
                    <span style={{marginLeft:"0.5em"}}/>
                    {head_status}
                  </Panel.Title>
                </Panel.Heading>
                <Panel.Body collapsible style={{padding: "5px", margin: "1px"}}>
                  <div className={body_class}>
                    {night_info}
                    <Row>
                      <Col md={8}>
                        <ul className="list-unstyled">
                          {devices.map((d,i) => {return <li key={i}>{d}</li>;})}
                        </ul>
                      </Col>
                      <Col md={4}>
                        {client.webcam &&
                         <ImageRefresh src={client.webcam}/>
                        }
                        {client.links &&
                         <div className="text-center">
                         {Object.keys(client.links).map((l,i) => {return <Link key={i} name={client.links[l].name} url={client.links[l].url}/>})}
                         </div>
                        }
                      </Col>
                    </Row>
                  </div>
                </Panel.Body>
              </Panel>
           </div>
        );
    }
}
