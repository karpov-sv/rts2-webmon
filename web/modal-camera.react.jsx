// Camera latest image preview
class CameraModal extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {show: false, focpos: null};
    }

    sendCommandEx(cmd, data) {
        $.ajax({
            url: this.props.root + this.props.client.name + "/api/" + cmd,
            dataType : "json",
            timeout : 10000,
            context: this,
            data: data,

            success: function(json){
                if (json.ret == 0)
                    this.message(json.ret + ' ' + cmd, 'text-success');
                else
                    this.message(json.ret + ' ' + cmd + ' ' + JSON.stringify(data), 'text-danger');

                if(this.props.onSuccess)
                    this.props.onSuccess();
            },

            error: function(){
                this.message("API request error: " + cmd + " " + JSON.stringify(data), 'text-danger');
            },

            complete: function(){
                this.requestState();
            }
        });
    }

    sendCommand(command, device=this.props.name) {
        this.sendCommandEx('cmd', {d: device, c: command});
    }

    sendVariable(name, value) {
        this.sendCommandEx('set', {d: this.props.name, n: name, v: value});
    }

    shouldComponentUpdate(nextProps, nextState) {
        if(nextState.show != this.state.show)
            return true;

        if(!nextProps.variables.last_preview_image != this.props.variables.last_preview_image ||
           !nextProps.variables.last_preview_time > this.props.variables.last_preview_time)
            return true;

        if(nextProps.title != this.props.title)
            return true;

        return false;
    }

    handleChangeFocpos(event) {
        this.setState({focpos: event.target.value});
    }

    render() {
        var url = this.props.root + this.props.client.name + '/jpeg/' + this.props.variables.last_preview_image + '?time=' + this.props.variables.last_preview_time;
        var src = this.props.root + this.props.client.name + '/preview/' + this.props.variables.last_preview_image + '?ps=512&lb=&time=' + this.props.variables.last_preview_time;
        var title = <>Image on {this.props.name} at <UnixTime time={this.props.variables.last_preview_time}/></>;

        return (
            <>
              {/* Activator element */}
              <span onClick={() => this.setState({show: true})}>
                {this.props.activator}
              </span>

              {/* Modal window */}
                <Modal bsSize="lg" show={this.state.show} onHide={() => this.setState({show: false})}>
                <Modal.Header closeButton>
                  <Modal.Title>{title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <a href={url}/>
                  <img className="img img-responsive center-block" src={src} onClick={()=>window.open(url, '_blank')}/>
                </Modal.Body>
                <Modal.Footer>
                  <span className="pull-left">
                      <Form inline onSubmit={evt => {this.sendVariable('focpos', this.state.focpos); evt.preventDefault();}}>
                        <Button bsStyle="default" onClick={() => this.sendCommand('expose')}>Expose</Button>
                        {' '}
                        <FormControl type="text" size={5}
                                     placeholder="focpos"
                                     value={this.state.focpos}
                                     onChange={(evt) => this.handleChangeFocpos(evt)}/>
                    </Form>
                  </span>

                  <Button bsStyle="default" onClick={() => this.setState({show: false})}>Close</Button>
                </Modal.Footer>
              </Modal>
            </>
        );
    }
}

CameraModal = ReactRedux.connect(mapStateToProps)(CameraModal);
