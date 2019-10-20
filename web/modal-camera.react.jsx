// Camera latest image preview
class CameraModal extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {show: false};
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
                  <Button bsStyle="default" onClick={() => this.setState({show: false})}>Close</Button>
                </Modal.Footer>
              </Modal>
            </>
        );
    }
}

CameraModal.defaultProps = {refresh:"5000"};
CameraModal = ReactRedux.connect(mapStateToProps)(CameraModal);
