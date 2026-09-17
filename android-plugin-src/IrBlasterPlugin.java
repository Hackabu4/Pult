package kz.remote.universal;

import android.content.Context;
import android.hardware.ConsumerIrManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.List;

@CapacitorPlugin(name = "IrBlaster")
public class IrBlasterPlugin extends Plugin {

    private ConsumerIrManager irManager;

    private ConsumerIrManager getIrManager() {
        if (irManager == null) {
            irManager = (ConsumerIrManager) getContext().getSystemService(Context.CONSUMER_IR_SERVICE);
        }
        return irManager;
    }

    @PluginMethod
    public void hasIrEmitter(PluginCall call) {
        ConsumerIrManager mgr = getIrManager();
        JSObject ret = new JSObject();
        ret.put("value", mgr != null && mgr.hasIrEmitter());
        call.resolve(ret);
    }

    @PluginMethod
    public void transmit(PluginCall call) {
        ConsumerIrManager mgr = getIrManager();
        if (mgr == null || !mgr.hasIrEmitter()) {
            call.reject("IR_NOT_AVAILABLE", "Бұл құрылғыда инфрақызыл таратқыш жоқ");
            return;
        }

        Integer frequency = call.getInt("frequency", 38000);
        JSArray patternArray = call.getArray("pattern");
        if (patternArray == null) {
            call.reject("NO_PATTERN", "pattern параметрі жоқ");
            return;
        }

        try {
            List<Object> list = patternArray.toList();
            int[] pattern = new int[list.size()];
            for (int i = 0; i < list.size(); i++) {
                pattern[i] = ((Number) list.get(i)).intValue();
            }
            mgr.transmit(frequency, pattern);
            call.resolve();
        } catch (Exception e) {
            call.reject("TRANSMIT_FAILED", e.getMessage(), e);
        }
    }
}
