// Queue variables
class QueueModal extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {show: false, targets: [], htargets: [], selectable: [], error: null, target_selected: null, scripts: null, message: null, queue: null, inprogress: false, vars: null, time1: null, time2: null, autoOpen: false, showNew: false};
    }

    requestTargets() {
        if(!this.props.auth)
            return;

        this.message("Loading target information...", "text-default");

        this.setState({inprogress: true});

        $.ajax({
            url: this.props.root + this.props.client.name + "/api/tlist",
            dataType : "json",
            timeout : 10000,
            context: this,

            success: function(json){
                this.setState({targets: json.d, htargets: json.h});
                this.message("Successfully loaded targets", "text-success");
            },

            error: function(){
                this.message("API request error while loading targets", "text-error");
            },

            complete: function(){
                this.setState({inprogress: false});
            }
        });
    }

    requestState() {
        if(!this.props.auth)
            return;

        this.setState({inprogress: true});

        $.ajax({
            url: this.props.root + this.props.client.name + "/api/get",
            dataType : "json",
            timeout : 10000,
            context: this,
            data: {d: this.props.name},

            success: function(json){
                this.setState({vars: json.d});
            },

            error: function(){
                this.message("API request error while loading state", "text-error");
            },

            complete: function(){
                this.setState({inprogress: false});
                clearTimeout(this.timer);

                if (this.state.show)
                    this.timer = setTimeout($.proxy(this.requestState, this), this.props.refresh);
            }
        });
    }

    requestSelectable() {
        if(!this.props.auth)
            return;

        $.ajax({
            url: this.props.root + this.props.client.name + "/api/tslist",
            dataType : "json",
            timeout : 10000,
            context: this,
            data: {b: 1},

            success: function(json){
                this.setState({selectable: json.d});
            },

            error: function(){
                this.message("API request error while loading selectable targets", "text-error");
            },

            complete: function(){
                clearTimeout(this.stimer);

                if (this.state.show)
                    this.stimer = setTimeout($.proxy(this.requestSelectable, this), this.props.refresh);
            }
        });
    }

    requestScripts(id) {
        if(!this.props.auth)
            return;

        this.setState({inprogress: true});

        $.ajax({
            url: this.props.root + this.props.client.name + "/api/tbyid",
            dataType : "json",
            timeout : 10000,
            context: this,
            data: {id: id, e: 1},

            success: function(json){
                var scripts = {};
                var d = json.d[0][6];

                for (var i in json.d[0][6])
                    scripts[Object.keys(d[i])[0]] = d[i][Object.keys(d[i])[0]];

                this.setState({scripts: scripts});
            },

            error: function(){
                this.message("API request error while loading target info", "text-error");
            }
        });
    }

    sendCommandEx(cmd, data, onSuccess) {
        $.ajax({
            url: this.props.root + this.props.client.name + "/api/" + cmd,
            dataType : "json",
            timeout : 10000,
            context: this,
            data: data,

            success: function(json){
                if (json.ret == 0)
                    this.message(json.ret + ' ' + cmd, 'text-success');
                else if (json.ret != null)
                    this.message(json.ret + ' ' + cmd + ' ' + JSON.stringify(data), 'text-danger');
                else
                    this.message(JSON.stringify(json), 'text-success');

                if(onSuccess)
                    onSuccess();
            },

            error: function(){
                this.message("API request error: " + cmd + " " + JSON.stringify(data), 'text-danger');
            },

            complete: function(){
                this.requestState();
                this.requestSelectable();
            }
        });
    }

    sendCommand(command, device=this.props.name) {
        this.message(command);
        this.sendCommandEx('cmd', {d: device, c: command});
    }

    componentDidMount() {
        if (this.state.show) {
            this.requestState();
            this.requestTargets();
            this.requestSelectable();
        }
    }

    componentWillUnmount() {
        clearTimeout(this.timer);
        clearTimeout(this.stimer);
    }

    shouldComponentUpdate(nextProps, nextState) {
        if(nextState.show != this.state.show)
            return true;

        if(nextProps.auth != this.props.auth)
            return true;

        if(!equal(this.state, nextState))
            return true;

        if(!equal(this.props.name, nextProps.name))
            return true;

        return false;
    }

    message(text, ctype="text-default") {
        var msg = text ? <span className={"me-auto " + ctype}>{text}</span> : null;

        this.setState({message: msg});
    }

    handleShow() {
        this.setState({show: true, message: null, target_selected: null, scripts: null, autoOpen: false});

        if (this.state.targets.length == 0)
            this.requestTargets();

        this.requestState();
        this.requestSelectable();
    }

    handleHide() {
        this.setState({show: false});
        clearTimeout(this.timer);
        clearTimeout(this.stimer);
    }

    showInfo(id) {
        for (var i = 0; i < this.state.targets.length; i++) {
            var tgt = this.state.targets[i];

            if (tgt[0] == id) {
                this.message(tgt[0] + ' / ' + tgt[1] + ' at ' + toSexa(tgt[2]/15, 'deg', false, ":", 3) + ' ' + toSexa(tgt[3], 'deg', true, ":", 2), 'text-success');
                return;
            }
        }

        this.message("Target not found: " + id, 'text-warning-emphasis');
    }

    handleInfo() {
        var id = this.state.target_selected[0].id;
        window.open(this.props.root + this.props.client.name + '/targets/' + id, '_blank');
    }

    handleQueue() {
        var id = this.state.target_selected[0].id;
        var t1 = this.state.time1 ? this.state.time1.unix() : "nan";
        var t2 = this.state.time2 ? this.state.time2.unix() : "nan";

        var error = queueTimesError(Number(t1), Number(t2));
        if (error) {
            this.message(error, 'text-danger');
            return;
        }

        if (this.state.time1 || this.state.time2) {
            this.sendCommand('queue_at ' + this.state.queue + ' ' + id + ' ' + t1 + ' ' + t2);
        } else {
            this.sendCommand('queue ' + this.state.queue + ' ' + id);
        }
    }

    handleQueueRemove(queue, id) {
        this.sendCommand('remove ' + queue + ' ' + id);
    }

    handleQueueMove(queue, id1, id2) {
        this.sendCommand('move ' + queue + ' ' + id1 + ' ' + id2);
    }

    handleTargetDisable(id) {
        this.sendCommandEx('update_target', {id: id, enabled: 0});
    }

    handleTargetEnable(id) {
        this.sendCommandEx('update_target', {id: id, enabled: 1});
    }

    handleTargetRestart(id) {
        this.sendCommandEx('update_target', {id: id, next_observable: 0});
    }

    handleTargetPostpone(id, delay) {
        this.sendCommandEx('update_target', {id: id, next_observable: now() + delay});
    }

    handleTargetPriority(id, priority) {
        this.sendCommandEx('update_target', {id: id, priority: priority});
    }

    handleTargetTimeStart(queue, id, time_end, time) {
        if (!time)
            return;

        var t1 = parseQueueTime(time);
        var t2 = parseQueueTime(time_end);

        if (t1 === undefined || t2 === undefined) {
            this.message("Cannot parse time: " + time, 'text-danger');
            return;
        }

        var unix1 = t1 ? t1.unix() : NaN;
        var unix2 = t2 ? t2.unix() : NaN;

        var error = queueTimesError(unix1, unix2);
        if (error) {
            this.message(error, 'text-danger');
            return;
        }

        this.sendCommand('update_times ' + queue + ' ' + id + ' ' + unix1 + ' ' + unix2);
    }

    handleTargetTimeEnd(queue, id, time_start, time) {
        if (!time)
            return;

        var t1 = parseQueueTime(time_start);
        var t2 = parseQueueTime(time);

        if (t1 === undefined || t2 === undefined) {
            this.message("Cannot parse time: " + time, 'text-danger');
            return;
        }

        var unix1 = t1 ? t1.unix() : NaN;
        var unix2 = t2 ? t2.unix() : NaN;

        var error = queueTimesError(unix1, unix2);
        if (error) {
            this.message(error, 'text-danger');
            return;
        }

        this.sendCommand('update_times ' + queue + ' ' + id + ' ' + unix1 + ' ' + unix2);
    }

    render() {
        var style = {padding: '0.2em', paddingLeft: '0.5em', paddingRight: '0.5em'};
        var vars = this.state.vars;

        var tlist = [];

        if (this.state.show) {
            for (var i = 0; i < this.state.targets.length; i++) {
                var tgt = this.state.targets[i];

                tlist.push({id: tgt[0], label: tgt[0] + ' / ' + tgt[1] + " " + tgt[4] });
            }
        }

        var queues = [];
        var queue_names = [];

        if (vars) {
            // Normal queues
            for (var qi = 0; qi < vars['queue_names'].length; qi++){
                var queue = (' ' + vars['queue_names'][qi]).slice(1);
                var targets = [];

                if (queue == 'simul')
                    continue;

                if (this.state.queue == null)
                    this.state.queue = queue;

                queue_names.push(queue);

                if (!vars[queue+'_ids'].length)
                    continue;

                for (var ti = 0; ti < vars[queue+'_ids'].length; ti++){
                    var time1 = <UnixTime time={vars[queue+'_start'][ti]}/>;
                    var etime1 = unixtime(vars[queue+'_start'][ti], false);
                    var time2 = <UnixTime time={vars[queue+'_end'][ti]}/>;
                    var etime2 = unixtime(vars[queue+'_end'][ti], false);

                    var item = <>
                                   <span style={{minWidth: "10em", display: "inline-block"}}>
                                       <a href={this.props.root + this.props.client.name + '/targets/' + vars[queue+'_ids'][ti]} target='_blank'>{vars[queue+'_ids'][ti]}</a>
                                       {' / ' + vars[queue+'_names'][ti]}
                                   </span>
                                   <span style={{minWidth: "1em", display: "inline-block"}}>
                                       <EditableValue value={time1} evalue={etime1} onChange={this.handleTargetTimeStart.bind(this, queue, ti, etime2)}/>
                                   </span>
                                   {'  -  '}
                                   <span style={{minWidth: "1em", display: "inline-block"}}>
                                       <EditableValue value={time2} evalue={etime2} onChange={this.handleTargetTimeEnd.bind(this, queue, ti, etime1)}/>
                                   </span>
                               </>;

                    targets.push(item);
                }

                queues.push(
                    <><h3 style={{margin: '0.2em'}}>{queue}</h3>
                      {targets.length > 0 &&
                       <ul className="list-group" style={{padding: "0.1em", margin: "0.1em"}}>
                         {targets.map((d,i) => {
                             return <li className="list-group-item" key={i} style={{padding: "5px 5px"}}>{d}
                                      <span className="float-end">
                                        <span className="bi bi-chevron-up icon" title="Move up" style={{marginLeft:"0.5em"}} onClick={this.handleQueueMove.bind(this, queue, i, i-1)}/>
                                        <span className="bi bi-chevron-down icon" title="Move down" style={{marginLeft:"0.5em"}} onClick={this.handleQueueMove.bind(this, queue, i, i+1)}/>
                                        <span className="bi bi-x-lg icon" title="Remove from queue" style={{marginLeft:"0.5em"}} onClick={this.handleQueueRemove.bind(this, queue, i)}/>
                                      </span>
                                    </li>;})}
                       </ul>
                      }
                    </>);
            }

            // Selectable/enabled targets
            var stargets = [];
            for (var ti = 0; ti < this.state.selectable.length; ti++){
                var t = this.state.selectable[ti];
                var color = "var(--bs-body-color)";

                if (t[7] > now ())
                    color = "var(--bs-secondary-color)";

                var item = <span style={{color: color}}>
                             <span style={{minWidth: "5em", marginRight: "1em", display: "inline-block"}}>
                               <a href={this.props.root + this.props.client.name + '/targets/' + t[0]} target='_blank'>{t[0]}</a>
                             </span>
                             <span style={{minWidth: "4em", marginRight: "1em", display: "inline-block"}} title={"Priority " + t[6]}>
                               <EditableValue value={t[5] ? t[5].toFixed(1) : '-'} evalue={t[6]} onChange={this.handleTargetPriority.bind(this, t[0])}/>
                             </span>
                             <span style={{marginRight: "1em", display: "inline-block"}}>
                               {t[1]}
                             </span>

                               {t[7] > now () &&
                                <span className="text-right">
                                  <span className="bi bi-hourglass-split" style={{marginRight: "0.2em"}}/>
                                  <UnixTime time={t[7]}/>
                                </span>
                               }
                           </span>;

                stargets.push(item);
            }
            queues.push(
                <><h3 style={{margin: '0.2em'}} onClick={()=>this.setState({autoOpen: !this.state.autoOpen})}>
                    Automatic selector
                    {this.state.autoOpen ?
                     <span className="bi bi-caret-up-fill ms-1 fs-6"/> :
                     <span className="bi bi-caret-down-fill ms-1 fs-6"/>}
                  </h3>
                  <Collapse in={this.state.autoOpen}>
                    <div>
                      {stargets.length > 0 &&
                       <ul className="list-group" style={{padding: "0.1em", margin: "0.1em"}}>
                         {stargets.map((d,i) => {
                             return <li className="list-group-item" key={i} style={{padding: "5px 5px"}}>{d}
                                      <span className="float-end">
                                        <span className="bi bi-check-lg icon" title="Reset" style={{marginLeft:"0.5em"}} onClick={this.handleTargetRestart.bind(this, this.state.selectable[i][0])}/>
                                        <span className="bi bi-slash-circle icon" title="Postpone for 1 hour" style={{marginLeft:"0.5em"}} onClick={this.handleTargetPostpone.bind(this, this.state.selectable[i][0], 3600)}/>
                                        <span className="bi bi-x-lg icon" title="Disable" style={{marginLeft:"0.5em"}} onClick={this.handleTargetDisable.bind(this, this.state.selectable[i][0])}/>
                                      </span>
                                    </li>;})}
                       </ul>
                      }
                    </div>
                  </Collapse>
                </>);

        }

        window.qstate = this.state;

        var times_error = queueTimesError(this.state.time1 ? this.state.time1.unix() : NaN,
                                          this.state.time2 ? this.state.time2.unix() : NaN);

        return (
            <>
              {/* Activator element */}
              {this.props.activator &&
               <span onClick={() => this.handleShow()}>
                 {this.props.activator}
               </span>
              }
              {!this.props.activator &&
               <span className="bi bi-card-list icon" onClick={() => this.handleShow()} title="Queues"/>
              }

              {/* Modal window */}
              <Modal size="lg" show={this.state.show} onHide={() => this.handleHide()}>
                <Modal.Header closeButton>
                  <Modal.Title>{this.props.title ? this.props.title : "Queues : " + this.props.client.description}</Modal.Title>
                </Modal.Header>

                <Modal.Body style={{'maxHeight': 'calc(100vh - 210px)', 'overflowY': 'auto', 'overflowX': 'auto', 'padding': 0}}>
                  {queues.map((d,i) => {return <div style={{padding: "0.2em"}} key={i} >{d}</div>;})}
                </Modal.Body>

                <Modal.Footer>
                  <FormGroup className="w-100 mb-1">
                    <InputGroup>
                      <InputGroup.Text>Target:</InputGroup.Text>

                      <Typeahead placeholder="Type ID or name to search for targets"
                                 multiple={false}
                                 selectHintOnEnter={true}
                                 flip={true}
                                 autoFocus={false}
                                 clearButton={true}
                                 isLoading={this.state.inprogress}

                                 onChange={(selected) => {
                                     // Handle selections...
                                     this.setState({target_selected: selected});
                                     if (selected && selected[0]) {
                                         this.showInfo(selected[0].id);
                                         this.requestScripts(selected[0].id);
                                     } else {
                                         this.message(null);
                                         this.setState({scripts: null});
                                     }
                                 }}
                                 selected={this.state.target_selected}
                                 options={tlist}
                      />

                        <DropdownButton id="queue-list"  title="Select queue for targets"
                                        variant="outline-secondary"
                                        title={this.state.queue ? this.state.queue : "Queue"}
                                        onSelect={(selected) => {this.setState({queue: selected});}}>
                          {queue_names.map((d,i) => {return <Dropdown.Item eventKey={d} key={i} active={d == this.state.queue}>{d}</Dropdown.Item>;})}
                        </DropdownButton>

                        <Button title="Display target information in a new window"
                                disabled={!this.state.target_selected || !this.state.target_selected.length}
                                variant="outline-secondary"
                                onClick={() => this.handleInfo()}>
                          Info
                        </Button>

                        <Button title="Enable target for automatic scheduling"
                                disabled={!this.state.target_selected || !this.state.target_selected.length}
                                variant="outline-secondary"
                                onClick={() => this.handleTargetEnable(this.state.target_selected[0].id)}>
                          Enable
                        </Button>

                        <Button title={times_error ? times_error : "Queue selected target"}
                                disabled={!this.state.target_selected || !this.state.target_selected.length || times_error != null}
                                variant="outline-secondary"
                                onClick={() => this.handleQueue()}>
                          Queue
                        </Button>
                    </InputGroup>
                  </FormGroup>

                  <FormGroup className="w-100 mb-1">
                    <Row className="g-0">

                      <Col md={6}  style={{padding: 0}}>
                        <InputGroup>
                          <InputGroup.Text>Start Time:</InputGroup.Text>

                          <ReactDatePicker selected={this.state.time1} onChange={(time, evt)=>this.setState({time1:fix(time, evt)})}
                                           onChangeRaw={(x)=>{var t = parseQueueTime(x.target.value); if(t !== undefined) this.setState({time1: t});}}
                                           placeholderText=" --- " showTimeSelect dateFormat='YYYY-MM-DD HH:mm:ss ZZ'
                                           timeFormat='HH:mm:ss' disabledKeyboardNavigation
                                           className="form-control" popperPlacement="top-end" minDate={new Date()} />

                        </InputGroup>
                      </Col>

                      <Col md={6} style={{padding: 0}}>
                        <InputGroup>
                          <InputGroup.Text>End Time:</InputGroup.Text>

                          <ReactDatePicker selected={this.state.time2} onChange={(time, evt)=>this.setState({time2:fix(time, evt)})}
                                           onChangeRaw={(x)=>{var t = parseQueueTime(x.target.value); if(t !== undefined) this.setState({time2: t});}}
                                           placeholderText=" --- " showTimeSelect dateFormat='YYYY-MM-DD HH:mm:ss ZZ'
                                           timeFormat='HH:mm:ss' disabledKeyboardNavigation
                                           className={"form-control" + (times_error ? " is-invalid bg-danger-subtle text-danger-emphasis" : "")} title={times_error}
                                           popperPlacement="top-end" minDate={this.state.time1 ? this.state.time1.clone() : moment()} />

                        </InputGroup>
                      </Col>

                    </Row>
                  </FormGroup>

                  {this.state.scripts &&
                   <ScriptsEdit
                     command={(cmd,data) => this.sendCommandEx(cmd,data,()=>this.requestScripts(this.state.target_selected[0].id))}
                     message={(m,s) => this.message(m,s)}
                     scripts={this.state.scripts} target={this.state.target_selected[0].id}
                   />
                  }

                  {this.state.showNew &&
                   <NewTarget
                     command={(cmd,data) => this.sendCommandEx(cmd,data,()=>this.requestTargets())}
                     message={(m,s) => this.message(m,s)}
                     onClose={() => this.setState({showNew: false})}
                     targets={this.state.targets}/>
                  }

                  {this.state.message ? this.state.message : ""}

                  <Button variant="outline-secondary" onClick={() => this.setState({showNew: !this.state.showNew})}>{this.state.showNew ? "Hide New Target" : "New Target"}</Button>
                  <Button variant="outline-secondary" onClick={() => this.handleHide()}>Close</Button>
                </Modal.Footer>
              </Modal>
            </>
        );
    }
}

// Returns error message if the queue time interval is invalid, null otherwise.
// Unset (NaN) times are allowed and mean "no limit".
function queueTimesError(unix1, unix2) {
    if (isFinite(unix1) && isFinite(unix2) && unix2 <= unix1)
        return "End time must be later than start time";

    if (isFinite(unix2) && unix2 <= now())
        return "End time is in the past";

    return null;
}

// Parse queue time typed by the user. Returns moment for a valid time, null
// for an explicitly unset one (empty, "---" or "nan"), undefined if invalid.
// Parsing is strict so that partially typed values are not accepted.
function parseQueueTime(text) {
    text = (text || '').trim();

    if (text == '' || text == '---' || text.toLowerCase() == 'nan')
        return null;

    var t = moment(text, ['YYYY-MM-DD HH:mm:ss ZZ', 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm'], true);

    return t.isValid() ? t : undefined;
}

// Round the time picked from the calendar to whole minutes; keep typed values as is
function fix(time, evt) {
    if (time && !(evt && evt.type == 'change'))
        time.seconds(0);

    return time;
}

QueueModal.defaultProps = {refresh:"10000"};
QueueModal = ReactRedux.connect(mapStateToProps)(QueueModal);

class NewTarget extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {id: null, name: null, coords: null};
    }

    handleChange(evt, id) {
        if (id == 'id') {
            this.setState({id: evt.target.value});

            var exists = false;

            for (var i = 0; i < this.props.targets.length; i++)
                if (this.props.targets[i][0] == evt.target.value) {
                    exists = true;
                    break;
                }

            if (exists)
                this.props.message('Target ' + evt.target.value + ' already exists', 'text-danger');
            else
                this.props.message(null);

        }
        if (id == 'name')
            this.setState({name: evt.target.value});
        if (id == 'coords')
            this.setState({coords: evt.target.value});
    }

    handleCreate() {
        if (this.state.id)
            this.props.command('create_target', {id: this.state.id, tn: this.state.name, ts: this.state.coords});
        else
            this.props.command('create_target', {tn: this.state.name, ts: this.state.coords});

        this.props.onClose();
    }

    render() {
        return <>
                 <Form className="w-100 mb-1">
                   <InputGroup>
                     <InputGroup.Text>New Target:</InputGroup.Text>

                     <FormControl placeholder="Id" onChange={(e) => this.handleChange(e, "id")} style={{minWidth: "6em"}}/>
                     <FormControl placeholder="Name" onChange={(e) => this.handleChange(e, "name")}/>
                     <FormControl placeholder="Coordinates or SIMBAD or MPC" onChange={(e) => this.handleChange(e, "coords")}/>
                     {/* <InputGroup.Button> */}
                     {/*   <Button onClick={() => this.props.onClose()}>Close</Button> */}
                     {/* </InputGroup.Button> */}
                       <Button variant="outline-secondary" onClick={() => this.handleCreate()}>Create</Button>
                   </InputGroup>
                 </Form>
               </>;
    }
}

class ScriptsEdit extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {camera: null, script: null};
    }

    handleChange(evt) {
        this.setState({script: evt.target.value});
    }

    handleUpdate() {
        this.props.command('change_script', {c: this.state.camera, s: this.state.script, id: this.props.target});
    }

    render() {
        var scripts = this.props.scripts;

        return <>
                 <FormGroup className="w-100 mb-1">
                   <InputGroup>
                        <DropdownButton id="camera-list"  title="Select camera"
                                        variant="outline-secondary"
                                        title={this.state.camera ? this.state.camera : "Camera"}
                                        onSelect={(selected) => {this.setState({camera: selected, script: scripts[selected][0]});}}>
                          {Object.keys(scripts).map((d,i) => {return <Dropdown.Item eventKey={d} key={i} active={d == this.state.camera}>{d}</Dropdown.Item>;})}
                        </DropdownButton>
                     <FormControl placeholder='Script' value={this.state.script ? this.state.script : ''}
                                  onChange={(evt) => this.handleChange(evt)}/>
                       <Button title="Update script for selected camera"
                               variant="outline-secondary"
                               disabled={!this.state.camera}
                               onClick={() => this.handleUpdate()}>
                         Update
                       </Button>
                   </InputGroup>
                 </FormGroup>
               </>;
    }
}
