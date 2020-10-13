class FramClient extends React.Component {
    shouldComponentUpdate(nextProps, nextState) {
        if(!equal(this.props, nextProps))
            return true;

        return false;
    }

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

        if (!client.connected || client.last_status < now() - 240)
            head_status.push(<Label className="danger" key="connlast">Last update <UnixTime time={client.last_status}/></Label>);

        if (status) {
            // Current night and Moon info
            if (status['centrald'] && status['centrald'].connected && status['centrald'].d && status['centrald'].d.lunar_phase) {
                if (this.props.view == 'compact') {
                    var mpopup = "Rise " + unixtime(status['centrald'].d.moon_rise) + "\nSet " + unixtime(status['centrald'].d.moon_set) + "\nPhase " + status['centrald'].d.lunar_phase.toFixed(1) + "\nLimb " + status['centrald'].d.lunar_limb.toFixed(1);

                    night_info = (
                        <div className="small text-muted" style={{padding: "5px"}}>
                          Night start <span className="text-info"><UnixTime time={status['centrald'].d.night_beginning}/></span> end <span className="text-info"><UnixTime time={status['centrald'].d.night_ending}/></span>.

                          Sun alt <span className="text-info">{status['centrald'].d.sun_alt.toFixed(1)}</span> deg.
                          &nbsp;
                          <span title={mpopup}>
                            Moon alt <span className="text-info">{status['centrald'].d.moon_alt.toFixed(1)}</span> deg.
                          </span>
                        </div>
                    );
                } else {
                    night_info = (
                        <div className="small text-muted" style={{padding: "5px"}}>
                          Night start <span className="text-info"><UnixTime time={status['centrald'].d.night_beginning}/></span> end <span className="text-info"><UnixTime time={status['centrald'].d.night_ending}/></span>.

                          Sun alt <span className="text-info">{status['centrald'].d.sun_alt.toFixed(1)}</span> deg.

                          Moon rise <span className="text-info"><UnixTime time={status['centrald'].d.moon_rise}/></span> set <span className="text-info"><UnixTime time={status['centrald'].d.moon_set}/></span>,

                        phase <span className="text-info">{status['centrald'].d.lunar_phase.toFixed(1)}</span> deg, limb <span className="text-info">{status['centrald'].d.lunar_limb.toFixed(1)}</span> deg, alt <span className="text-info">{status['centrald'].d.moon_alt.toFixed(1)}</span> deg.
                            </div>
                    );
                }
            }

            // Devices
            for (var i = 0; i < client.devices.length; i++) {
                var name = client.devices[i];
                var type = status[name].type;

                var dev_name = name;
                var dev_class = "text-danger bg-danger";
                var dev_body = null;
                var dev_sub = [];

                if (status[name].connected) {
                    var vars = status[name].d;
                    var state = status[name].state;
                    var statestring = status[name].statestring;

                    statestring = statestring.replace("| SHUTTER_CLEARED", "");
                    statestring = statestring.replace("| IMAGE_READY", "");
                    statestring = statestring.replace("BLOCK TELESCOPE MOVEMENT", "BLOCK MOVE");
                    statestring = statestring.replace("| not ending", "");

                    if (this.props.view == 'compact') {
                        statestring = statestring.replace("BLOCK_OPEN", "");
                        statestring = statestring.replace("BLOCK_CLOSE", "");
                        statestring = statestring.replace("BLOCK EXPOSURE", "");
                        statestring = statestring.replace("# BLOCK EXPOSING", "");
                        statestring = statestring.replace("# BLOCK READOUT", "");
                        statestring = statestring.replace("BLOCK MOVE", "");

                        statestring = statestring.replace("| idle", "");

                        statestring = statestring.replace(/\s*\|\s*$/, "")
                        statestring = statestring.replace(/\s*#\s*$/, "")
                        statestring = statestring.replace(/\s*\|\s*$/, "")
                    }

                    if (this.props.auth)
                        dev_name = <DeviceModalExt name={name} client={client} activator={name} />;
                    else
                        dev_name = <DeviceModal title={name + "   " + status[name].statestring} activator={name} variables={vars}/>;

                    dev_body = statestring;

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
                    else if (type == 4 && (vars['emergency']))
                        dev_class = "text-danger bg-danger";
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
                    if (type == 2) {
                        if (((cstate & 0x0f) != 2 && (cstate & 0x0f) != 3 && (cstate & 0x0f) != 4) && (state & 0x07) != 2)
                            dev_sub.push(<span className="label label-danger" key="mount_not_parked">
                                         Mount is not parked
                                         </span>);

                        if (vars['Gstat'] == '1')
                            dev_sub.push(<span className="label label-danger" key="mount_stopped">
                                         Mount stopped
                                         </span>);
                    }

                    // camera
                    if (type == 3) {
                        // Current script
                        if (vars['SCRIPT']) {
                            var s1 = vars['SCRIPT'].substring(0, vars['scriptPosition']);
                            var s2 = vars['SCRIPT'].substring(vars['scriptPosition'], vars['scriptPosition']+vars['scriptLen']);
                            var s3 = vars['SCRIPT'].substring(vars['scriptPosition']+vars['scriptLen']);

                            if (s2)
                                dev_sub.push(<span className="text-muted" key="camera_script_1">{s1}<mark>{s2}</mark>{s3}</span>);
                            else
                                dev_sub.push(<span className="text-muted" key="camera_script_1">{s1}{s2}{s3}</span>);
                        }

                        // Camera temperature
                        if (vars['CCD_SET'] && vars['CCD_TEMP'] && vars['CCD_SET'] < vars['CCD_TEMP']-1)
                            dev_sub.push(<span className="label label-warning" key="camera_hot">
                                         Camera not cooled
                                         </span>);

                        // Latest image previewer
                        if (this.props.auth && vars['last_preview_image'])
                            dev_body = <>{dev_body}<span className="pull-right"><CameraModal name={name} client={client} activator={<span className="glyphicon glyphicon-picture icon" title="Latest image"/>} variables={vars}/></span></>;
                    }

                    // dome
                    if (type == 4) {
                        if (!(vars['sw_open_left']) && (state & 0x06))
                            dev_sub.push(<span className="label label-warning" key="sw_open_left">
                                           Left open switch is off
                                         </span>);

                        if (!(vars['sw_open_right']) && (state & 0x06))
                            dev_sub.push(<span className="label label-warning" key="sw_open_right">
                                           Right open switch is off
                                         </span>);

                        if (!(vars['sw_close_left']) && !(state & 0x06))
                            dev_sub.push(<span className="label label-warning" key="sw_open_left">
                                           Left close switch is off
                                         </span>);

                        if (!(vars['sw_close_right']) && !(state & 0x06))
                            dev_sub.push(<span className="label label-warning" key="sw_open_right">
                                           Right close switch is off
                                         </span>);

                        if (vars['12V'] == 0 || vars['12VDC'] == 0)
                            dev_sub.push(<span className="label label-danger" key="12v_off">
                                           12V is off
                                         </span>);
                        if ((vars['48V'] == 0 || vars['48VDC'] == 0) && (client.name == 'cta-s0' || client.name == 'cta-s1'))
                            dev_sub.push(<span className="label label-danger" key="48v_off">
                                           48V is off
                                         </span>);
                        if (vars['mount_is_on'] == 0 && (client.name == 'cta-n' || client.name == 'auger'))
                            dev_sub.push(<span className="label label-danger" key="mount_off">
                                           Mount is off
                                         </span>);
                        if (vars['emergency'])
                            dev_sub.push(<span className="label label-danger" key="emergency">
                                           Emergency
                                         </span>);
                        if (vars['timeout_occured'])
                            dev_sub.push(<span className="label label-danger" key="timeout">
                                           Timeout
                                         </span>);
                        if (vars['on_battery'])
                            dev_sub.push(<span className="label label-danger" key="on_battery">
                                           On Battery
                                         </span>);
                        if (vars['battery_low'])
                            dev_sub.push(<span className="label label-danger" key="battery_low">
                                           Battery Low
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
                        else if (client.name == 'cta-s0' || client.name == 'cta-s1')
                            elem = (<span className="text-muted" key={'weather1'}>
                                      wind { vars['WIND_AVG'].toFixed(1) } m/s.
                                    </span>);

                        if (vars['rain'])
                            elem = [elem, <Label className="danger" key={'weather2'}>Rain</Label>];

                        if (elem)
                            dev_sub.push(elem);
                    }

                    if (name == 'PARANAL') {
                        dev_sub.push(<span className="text-muted" key={'weather1'}>
                                      wind { vars['windspeed'].toFixed(1) } m/s,
                                      temperature { vars['temperature'].toFixed(1) } C,
                                      humidity { vars['humidity'].toFixed(1) }%,
                                      pressure { vars['pressure'].toFixed(1) }.
                                    </span>);
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

                    // grbd
                    if (type == 9) {
                        if (vars['last_packet'] && vars['last_packet'] < now() - 1800)
                            dev_sub.push(<span className="label label-warning">Last packet at <UnixTime time={vars['last_packet']}/></span>);
                        if (vars['last_target_time'] && vars['last_target_time'] > now() - 0.5*3600)
                            dev_sub.push(<span className="text-warning">Last target: {vars['last_target']} / <a href={this.props.root + client.name + '/targets/'+ vars['last_target_id']} target="_blank">{vars['last_target_id']}</a> at <UnixTime time={vars['last_target_time']}/></span>);
                        else if (vars['last_target_time'] && vars['last_target_time'] > now() - 6*3600)
                            dev_sub.push(<span className="text-default">Last target: {vars['last_target']} / <a href={this.props.root + client.name + '/targets/'+ vars['last_target_id']} target="_blank">{vars['last_target_id']}</a> at <UnixTime time={vars['last_target_time']}/></span>);
                    }

                    // executor
                    if (type == 20) {
                        if (vars['ignore_day'])
                            dev_sub.push(<span className="label label-warning">Ignoring day</span>);
                        if (vars['PI'].indexOf('magic') !== -1)
                            dev_sub.push(<span className="label label-success">MAGIC follow-up active</span>);
                    }

                    // imgproc
                    if (type == 21) {
                        if (!vars['apply_corrections'])
                            dev_sub.push(<span className="label label-warning">Astrometric corrections disabled</span>);
                        if (vars['free_diskspace'] && vars['free_diskspace']/1024/1024/1024 < 10)
                            dev_sub.push(<span className="label label-danger">Low disk space: {(vars['free_diskspace']/1024/1024/1024).toFixed(1)} Gb</span>);

                    }

                    // selector
                    if (type == 22) {
                        if (vars['ignore_day'])
                            dev_sub.push(<span className="label label-warning">Ignoring day</span>);

                        if (vars['queue_names'])
                            for (var qi = 0; qi < vars['queue_names'].length; qi++){
                                var queue = vars['queue_names'][qi];
                                var targets = [];

                                for (var ti = 0; ti < vars[queue+'_ids'].length; ti++){
                                    var title = unixtime(vars[queue+'_start'][ti]) + " - " + unixtime(vars[queue+'_end'][ti]);
                                    var ttype = 'info';

                                    if (status['EXEC'] && status['EXEC'].d && status['EXEC'].d['current'] == vars[queue+'_ids'][ti])
                                        ttype = 'success';
                                    else if (vars['next_id'] == vars[queue+'_ids'][ti])
                                        ttype = 'warning';

                                    targets.push(<span className={"label label-"+ttype} key={ti} title={title} style={{margin: "0.0em"}}>{vars[queue+'_ids'][ti] + ' / ' + vars[queue+'_names'][ti]}</span>);
                                }

                                if (targets.length)
                                    // dev_sub.push(<span>{queue}: {targets}</span>);
                                    dev_sub.push(<>{queue}: {targets.map((d,i) => {return <>{d} </>})}</>);
                            }
                    }

                    // AUGER
                    if (name == 'AUGER') {
                        dev_sub.push(<span className="text-muted" key={'auger1'}>
                                       last rejected:  <UnixTime time={vars['last_rejected']}/>, accepted:  <UnixTime time={vars['last_date']}/>
                                    </span>);
                    }

                    // UPS
                    if (name == 'UPS') {
                        if (vars['battery.charge'] && vars['battery.charge'] != 100)
                            dev_sub.push(<span className="label label-danger">Battery {vars['battery.charge']} % : {vars['ups.status']}</span>);
                    }
                } else {
                    dev_body = <span class="text-danger">disconnected since <UnixTime time={status[name].last_status}/></span>;
                }

                // Construct the piece describing single device
                var body = (
                    <span className={dev_class}>
                      <span style={{minWidth: "7em", display: "inline-block"}}>{dev_name}</span>
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

        // List of commands for Quick Command modal
        var commands = {'Centrald': {'Off': 'centrald.off', 'Standby': 'centrald.standby', 'On': 'centrald.on'}};

        if (client.name == 'cta-n')
            commands['Mount'] = {'Park': 'T0.park', 'Stop': 'T0.stop', 'Toggle': 'DOME.toggle_mount'};
        else if (client.name == 'auger')
            commands['Mount'] = {'Park': 'GM2000.park', 'Stop': 'GM2000.stop', 'Toggle': 'DOME.toggle_mount'};
        else if (client.name == 'cta-s0' || client.name == 'cta-s1')
            commands['Mount'] = {'Park': 'T0.park', 'Stop': 'T0.stop', 'On': 'DOME.48VDC=1', 'Off': 'DOME.48VDC=0'};

        commands['Dome'] = {'Open': 'DOME.open', 'Close': 'DOME.close', 'Reset Emergency': 'DOME.reset_emergency', 'Reset next': 'DOME.reset_next'};

        if (client.name == 'cta-n') {
            commands['12V'] = {'On': "DOME.12VDC=1", 'Off': "DOME.12VDC=0"};
        } else if (client.name == 'auger') {
            commands['12V'] = {'On': "DOME.12V=1", 'Off': "DOME.12V=0"};
        } else if (client.name == 'cta-s0' || client.name == 'cta-s1') {
            commands['12V'] = {'On': "DOME.12VDC=1", 'Off': "DOME.12VDC=0"};
        }

        if (client.name == 'cta-n') {
            commands['C0'] = {'Cooling ON': 'C0.CCD_SET=-20', 'Cooling OFF': 'C0.CCD_SET=50'};
            commands['WF0'] = {'Cooling ON': 'WF0.CCD_SET=-20', 'Cooling OFF': 'WF0.CCD_SET=50'};
        }

        if (client.name == 'auger') {
            commands['NF4'] = {'Cooling ON': 'NF4.CCD_SET=-20', 'Cooling OFF': 'NF4.CCD_SET=50'};
            commands['WF8'] = {'Cooling ON': 'WF8.CCD_SET=-20', 'Cooling OFF': 'WF8.CCD_SET=50'};
        }

        if (client.name == 'cta-s0' || client.name == 'cta-s1') {
            commands['WF0'] = {'Cooling ON': 'WF0.CCD_SET=-20', 'Cooling OFF': 'WF0.CCD_SET=50'};
            commands['FWF'] = {'-100': 'FWF.FOC_TAR-=100', '-10': 'FWF.FOC_TAR-=10', '+10': 'FWF.FOC_TAR+=10', '+100': 'FWF.FOC_TAR+=100'};
        }

        commands['EXEC'] = {'Stop': 'EXEC.stop', 'Disable': 'EXEC.enabled=0', 'Enable': 'EXEC.enabled=1', 'Enable Next': 'EXEC.selector_next=1', 'Ignore day ON': 'EXEC.ignore_day=1', 'Ignore day OFF': 'EXEC.ignore_day=0'};
        commands['Selector'] = {'Disable': 'SEL.selector_enabled=0', 'Enable': 'SEL.selector_enabled=1'};
        commands['IMGP'] = {'Disable corrections': 'IMGP.apply_corrections=0', 'Enable corrections': 'IMGP.apply_corrections=1'};

        // Construct the component
        var pstyle = {};
        if (this.props.view == 'compact')
            pstyle['margin'] = '1px';
        var panel =
            <Panel expanded={client.connected} style={pstyle}>
              <Panel.Heading>
                <Panel.Title componentClass='h3'>
                  {client.description}
                  <span style={{marginLeft:"0.5em"}}/>
                  {head_status}
                  {client.connected && this.props.auth &&
                   <span className="pull-right">
                     <LogModal client={client} />

                     <span style={{marginLeft:"0.5em"}}/>

                     <ObsModal client={client} />

                     <span style={{marginLeft:"0.5em"}}/>

                     <QueueModal name='SEL' client={client} />

                     <span style={{marginLeft:"0.5em"}}/>

                     <span className="glyphicon glyphicon-picture icon" onClick={()=>window.open(this.props.root + client.name + '/preview/', '_blank')} title="Image Previews"/>

                     <span style={{marginLeft:"0.5em"}}/>

                     <CmdModal client={client} commands={commands}/>
                   </span>
                  }
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
                       <ImageRefresh src={client.webcam} popup={1} title={client.description + ' Webcam'}/>
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
            </Panel>;

        return <>
                 {this.props.view == 'full'
                  ? panel
                  : <Col md={6} style={{padding: '1px'}}>
                      {panel}
                    </Col>
                 }
               </>;
    }
}

FramClient = ReactRedux.connect(mapStateToProps)(FramClient);
